import ast, asyncio, io, os, re, shutil, subprocess, sys, tempfile, time, tokenize
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator, Awaitable, Callable, Optional

Ask = Callable[..., Awaitable[str]]
env = os.getenv

NUM_CTX = int(env("NUM_CTX", "8192"))                     # use 12288 for the agent if your VRAM allows
BUDGETS = {"dsa": int(env("DSA_SECONDS", "600")), "web": int(env("WEB_SECONDS", "2400"))}
FIX_ROUNDS = int(env("AGENT_FIX_ROUNDS", "3"))
OUT_ROOT = Path(env("AGENT_OUT", "agent_output"))
DSA_FILES = {"solution.py", "brute.py", "gen.py"}
WEB_FILES = {"index.html", "style.css", "script.js"}
LANGS = {"index.html": "html", "style.css": "css", "script.js": "javascript"}
UNSAFE = re.compile(r"\b(?:import|from)\s+(?:os|subprocess|shutil|socket|requests|urllib|http|ctypes|importlib|pathlib)\b"
                    r"|\b(?:eval|exec|open|__import__)\s*\(")
ID_RE = re.compile(r'id\s*=\s*["\']([^"\']+)["\']')
FILE_RE = re.compile(r"###\s*FILE:\s*`?([\w./-]+)`?[^\n]*\n```[\w+-]*[ \t]*\n(.*?)```", re.S)
FENCE_RE = re.compile(r"```[\w+-]*[ \t]*\n(.*?)```", re.S)
TICKS = "`" * 3


# ---------- helpers ----------
class Deadline:
    def __init__(self, seconds: float): self.end = time.monotonic() + seconds
    def left(self) -> float: return self.end - time.monotonic()
    def expired(self) -> bool: return self.left() <= 0


def _run_blocking(cmd, cwd, timeout):
    try:
        p = subprocess.run(cmd, cwd=cwd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                           stderr=subprocess.STDOUT, timeout=timeout)
    except subprocess.TimeoutExpired:
        return -1, f"TIMEOUT after {timeout:.0f}s"
    except FileNotFoundError:
        return -2, f"command not found: {cmd[0]}"
    return p.returncode, p.stdout.decode("utf-8", errors="replace")[-2000:]


async def run_cmd(cmd: list[str], cwd, timeout: float = 30) -> tuple[int, str]:
    try:
        proc = await asyncio.create_subprocess_exec(*cmd, cwd=cwd, stdin=asyncio.subprocess.DEVNULL,
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    except NotImplementedError:                       # Windows loop without subprocess support
        return await asyncio.to_thread(_run_blocking, cmd, cwd, timeout)
    except FileNotFoundError:
        return -2, f"command not found: {cmd[0]}"
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return -1, f"TIMEOUT after {timeout:.0f}s"
    return proc.returncode, out.decode("utf-8", errors="replace")[-2000:]


def parse_files(reply: str, allowed: set[str]) -> dict[str, str]:
    found = ((Path(n).name, b) for n, b in FILE_RE.findall(reply or ""))
    return {n: b.rstrip() + "\n" for n, b in found if n in allowed}


def extract_one(reply: str, name: str) -> Optional[str]:
    files = parse_files(reply, {name})
    if name in files:
        return files[name]
    m = FENCE_RE.search(reply or "")
    return m.group(1).rstrip() + "\n" if m else None


def clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    head = limit * 2 // 3
    return text[:head] + "\n[... truncated ...]\n" + text[-(limit - head):]


def room_chars(num_predict: int) -> int:
    return max(2000, (NUM_CTX - num_predict - 900) * 3)


def block(name: str, body: str, lang: str = "", limit: int = 0) -> str:
    """One '### FILE:' block; always puts the closing fence on its own line."""
    body = clip(body, limit) if limit else body
    return f"### FILE: {name}\n{TICKS}{lang}\n{body.rstrip()}\n{TICKS}"


def fmt(name: str, lang: str) -> str:
    return f"Reply in exactly this format:\n### FILE: {name}\n{TICKS}{lang}\n...\n{TICKS}"


def html_ids(html: str) -> set[str]:
    return set(ID_RE.findall(html))


def missing_ids(html: str, js: str) -> list[str]:
    used = set(re.findall(r'getElementById\(\s*["\']([^"\']+)["\']', js))
    used |= set(re.findall(r'querySelector\(\s*["\']#([\w-]+)["\']', js))
    return sorted(used - html_ids(html))


def ensure_links(html: str) -> str:
    for needle, tag, close, at_end in (("style.css", '<link rel="stylesheet" href="style.css">', "</head>", False),
                                       ("script.js", '<script src="script.js" defer></script>', "</body>", True)):
        if needle not in html:
            if close in html:
                html = html.replace(close, f"{tag}\n{close}", 1)
            else:
                html = html + "\n" + tag if at_end else tag + "\n" + html
    return html


def precheck(files: dict[str, str]) -> Optional[str]:
    """Syntax-check every generated file so the error names the file and line."""
    for name, body in files.items():
        try:
            ast.parse(body)
        except SyntaxError as e:
            return f"{name}: SyntaxError on line {e.lineno}: {e.msg}: {(e.text or '').strip()}"
    return None


def strip_comments(code: str) -> str:
    """Drop comments (self-corrections, notes) from helper files; returns the code unchanged if it can't be tokenized."""
    try:
        toks = [t for t in tokenize.generate_tokens(io.StringIO(code).readline) if t.type != tokenize.COMMENT]
        return "\n".join(l.rstrip() for l in tokenize.untokenize(toks).splitlines()) + "\n"
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return code


def solve_params(code: str) -> list[str]:
    try:
        for n in ast.parse(code).body:
            if isinstance(n, ast.FunctionDef) and n.name == "solve":
                return [a.arg for a in n.args.args]
    except SyntaxError:
        pass
    return []


def validate_solution_api(solution: str) -> Optional[str]:
    if not re.search(r"^def\s+solve\s*\(", solution, re.M):
        return "solution.py must define a top-level function: def solve(...)"
    return None


# ---------- prompts ----------
CLASSIFY_SYS = ("Classify the coding request. Reply with exactly one word. "
                "snippet = small function, explanation, debugging or one-off script. "
                "dsa = a self-contained algorithm or data-structure problem with a clear function input and output "
                "(LeetCode style). web = needs HTML, CSS and JavaScript files (a web page or browser app).")
CODE_SYS = ("You are a careful programmer. Reply ONLY with code blocks in the exact format requested. "
            "No explanations, no text outside the blocks.")
PLAN_SYS = "You are a precise software planner."


def p_solution(task):
    return (f"Task:\n{task}\n\nWrite an efficient, correct Python solution. Define solve(...) with the parameters the "
            "task implies; define exactly one top-level function, no aliases, no extra top-level code, comments only about the code itself. Standard library "
            "only (no os, subprocess, file or network access). No input(), no printing.\n\n" + fmt("solution.py", "python"))


def p_solution_fix(task, solution, error):
    return (f"Task:\n{task}\n\nThe generated solution.py is invalid:\n{error}\n\n"
            f"Current file:\n{block('solution.py', solution, 'python', 4000)}\n\n"
            "Return ONLY the corrected, complete solution.py.\n" + fmt("solution.py", "python"))


def p_brute(task, signature):
    return (f"Task:\n{task}\n\nThe solution has this signature (you have NOT seen its body):\n{signature}\n\n"
            "Write brute.py: define solve(...) with the SAME signature, using the simplest obviously-correct approach "
            "(slow is fine, no cleverness). Standard library only, no input(), no printing, no files or network. "
            "No comments, no explanations, no alternative attempts: write the file once.\n\n"
            + fmt("brute.py", "python"))


def p_gen(task, signature, params):
    n = len(params)
    return (f"Task:\n{task}\n\nThe solution has this signature:\n{signature}\n\n"
            f"Write gen.py: define gen() that returns a TUPLE of exactly {n} positional argument(s), in this order: "
            f"{', '.join(params) or '(as in the signature)'} (use (x,) for a single argument). Return only that tuple: no labels, "
            "no strings describing the case, no keyword arguments. Small random inputs (sizes up to 8, values -10 to 10, "
            "strings over a small alphabet such as 'abc' so repeats happen) that ALWAYS obey the task's constraints. "
            "Optionally define canon(result) to normalise results when several answers are valid. Use `import random`. "
            "Standard library only, no input(), no printing, no files or network. "
            "No comments, no explanations, no alternative attempts: write the file once.\n\n" + fmt("gen.py", "python"))


def p_dsa_fix(task, files, output, room):
    body = "\n".join(block(n, files[n], "python", room // 4) for n in sorted(DSA_FILES))
    return (f"Task:\n{task}\n\nThe checks failed:\n{clip(output, 1200)}\n\nCurrent files:\n{body}\n\n"
            "Using the task statement, decide which file is wrong (solution.py, brute.py or gen.py). "
            "Return ONLY the corrected file(s), complete, in the same FILE format.")


MISMATCH_RE = re.compile(r"input: (.*)\nsolution returned: (.*)\nbrute force returned: (.*)")
JUDGE_SYS = "You are a careful judge. Work out the answer by hand from the task statement. Reply with exactly one letter."


def p_judge(task, inp, a, b):
    return (f"Task:\n{task}\n\nFor the input {inp} two programs gave different results.\nA: {a}\nB: {b}\n\n"
            "Which result is correct according to the task statement? Reply with exactly one letter: A or B.")


def p_file_fix(task, name, body, note):
    return (f"Task:\n{task}\n\n{note}\n\nCurrent file:\n{block(name, body, 'python', 4000)}\n\n"
            f"Return ONLY the corrected, complete {name}. No comments, no explanations.\n" + fmt(name, "python"))


def p_plan(task):
    return ("Plan a small web app for this request using plain HTML, CSS and JavaScript only (no libraries, no "
            f"network, no build step).\nRequest: {task}\n\nWrite a CONTRACT in plain text, under 250 words:\n"
            "1) one line describing the app\n2) every element id, with tag and purpose\n3) CSS class names\n"
            "4) JS function names and the state they keep\n5) the user interactions")


def p_html(task, contract):
    return (f"Request: {task}\n\nCONTRACT:\n{contract}\n\nWrite index.html following the CONTRACT exactly "
            "(use those ids). Link style.css in <head> and script.js with defer before </body>. No inline "
            "<style> or <script>. " + fmt("index.html", "html"))


def p_css(task, contract, html):
    return (f"Request: {task}\n\nCONTRACT:\n{contract}\n\nindex.html:\n{TICKS}html\n{html.rstrip()}\n{TICKS}\n\n"
            "Write style.css: a clean, simple, responsive layout using the ids and classes above. "
            + fmt("style.css", "css"))


def p_js(task, contract, html):
    return (f"Request: {task}\n\nCONTRACT:\n{contract}\n\nindex.html:\n{TICKS}html\n{html.rstrip()}\n{TICKS}\n\n"
            "Write script.js. Only use element ids that exist in index.html. No libraries, no network calls. "
            "Make every feature in the CONTRACT work. " + fmt("script.js", "javascript"))


def p_web_fix(task, contract, files, errors, room):
    names = ["index.html", "script.js"] + (["style.css"] if "css" in errors.lower() else [])
    each = max(1500, (room - len(contract) - len(errors)) // len(names))
    body = "\n".join(block(n, files[n], LANGS[n], each) for n in names)
    return (f"Request: {task}\n\nCONTRACT:\n{clip(contract, 1500)}\n\nThe checks failed:\n{clip(errors, 1500)}\n\n"
            f"Current files:\n{body}\n\nReturn ONLY the file(s) that need changes, complete, in the same "
            "FILE format. Keep every id from the CONTRACT.")


HARNESS = '''import copy, importlib.util, inspect, sys
def load(name):
    spec = importlib.util.spec_from_file_location(name, name + ".py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
sol, brute, gen = load("solution"), load("brute"), load("gen")
canon = getattr(gen, "canon", lambda x: x)
nparams = len(inspect.signature(sol.solve).parameters)
n = int(sys.argv[1]) if len(sys.argv) > 1 else 300
for _ in range(n):
    args = gen.gen()
    if not isinstance(args, tuple) or len(args) != nparams:
        print("GEN ERROR: gen.py must return a tuple of exactly", nparams, "item(s), one per solve parameter; got", repr(args))
        sys.exit(1)
    a = canon(sol.solve(*copy.deepcopy(args)))
    b = canon(brute.solve(*copy.deepcopy(args)))
    if a != b:
        print("MISMATCH")
        print("input:", repr(args))
        print("solution returned:", repr(a))
        print("brute force returned:", repr(b))
        sys.exit(1)
print("OK", n)
'''


# ---------- web checks (browser check needs: pip install playwright && playwright install chromium) ----------
async def browser_check(d: Path) -> tuple[list[str], str]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return [], "browser check skipped (playwright not installed)"
    errors: list[str] = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            try:
                page = await browser.new_page()
                page.on("pageerror", lambda e: errors.append(f"JS error: {e}"))
                page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

                async def only_local(route):          # block anything that is not a local file
                    await (route.continue_() if route.request.url.startswith("file:") else route.abort())

                await page.route("**/*", only_local)
                await page.goto((d / "index.html").resolve().as_uri())
                await page.wait_for_timeout(300)
                if await page.evaluate("document.body.children.length") == 0:
                    errors.append("the page body is empty")
                for el in await page.query_selector_all("input[type=text], input[type=number], input:not([type]), textarea"):
                    try: await el.fill("5", timeout=1000)
                    except Exception: pass
                for btn in await page.query_selector_all("button"):
                    try: await btn.click(timeout=1000)
                    except Exception: pass
                    await page.wait_for_timeout(100)
            finally:
                await browser.close()
    except Exception as e:                            # browser missing, launch failed, ...
        return [], f"browser check skipped ({type(e).__name__}: {str(e)[:100]})"
    return errors[:10], "browser check ran"


async def web_checks(d: Path) -> tuple[list[str], list[str]]:
    """Cheap checks first; the browser check only runs once those pass."""
    errs, notes = [], []
    html, js = (d / "index.html").read_text(encoding="utf-8"), (d / "script.js").read_text(encoding="utf-8")
    if not js.strip():
        errs.append("script.js is empty")
    elif shutil.which("node"):
        code, out = await run_cmd(["node", "--check", "script.js"], d, 15)
        if code != 0:
            errs.append(f"node --check script.js failed:\n{out}")
    else:
        notes.append("syntax check skipped (node not found)")
    if miss := missing_ids(html, js):
        errs.append(f"script.js uses ids that are not in index.html: {', '.join(miss)}. "
                    f"ids in index.html: {', '.join(sorted(html_ids(html)))}")
    if not errs:
        berrs, note = await browser_check(d)
        errs += berrs
        notes.append(note)
    return errs, notes


# ---------- agent ----------
class CodingAgent:
    def __init__(self, ask: Ask):
        self.ask = ask

    async def _call(self, dl: Deadline, system: str, prompt: str, mode: str, num_predict: int) -> Optional[str]:
        if dl.expired():
            return None
        try:
            return await asyncio.wait_for(self.ask(system, prompt, mode=mode, num_predict=num_predict), dl.left())
        except asyncio.TimeoutError:
            return None

    async def _code(self, dl, prompt, name, mode, num_predict) -> Optional[str]:
        """Two tries (the retry is non-thinking, since thinking can eat the whole token budget).
        A reply that is not valid Python counts as a miss; the last such reply is still returned for the fix loop."""
        last = None
        for m in (mode, "fast"):
            code = extract_one(await self._call(dl, CODE_SYS, prompt, m, num_predict) or "", name)
            if not code:
                continue
            if not name.endswith(".py") or precheck({name: code}) is None:
                return code
            last = code
        return last

    async def classify(self, task: str) -> str:
        reply = await self.ask(CLASSIFY_SYS, task[:2000], mode="fast", num_predict=20)
        if m := re.search(r"\b(snippet|dsa|web)\b", (reply or "").lower()):
            return m.group(1)
        if re.search(r"\b(html|css|javascript|website|web ?page|landing page|browser)\b", task, re.I):
            return "web"
        if re.search(r"\b(leetcode|algorithm|subarray|substring|palindrom\w*|linked list|dynamic programming|"
                     r"time complexity|binary tree|graph)\b", task, re.I):
            return "dsa"
        return "snippet"

    async def run(self, task: str) -> AsyncIterator[tuple[str, str]]:
        """Yields ("status", text) while working, then ("final", text). ("fallback", "") = not my job."""
        tier = await self.classify(task)
        if tier == "snippet":
            yield "fallback", ""
            return
        dl = Deadline(BUDGETS[tier])
        yield "status", f"{tier} task, time budget {BUDGETS[tier] // 60} min"
        async for item in (self._dsa if tier == "dsa" else self._web)(task, dl):
            yield item

    def _save(self, tier: str, files: dict[str, str]) -> Path:
        out = OUT_ROOT / f"{tier}-{datetime.now():%Y%m%d-%H%M%S}"
        out.mkdir(parents=True, exist_ok=True)
        for name, body in files.items():
            (out / name).write_text(body, encoding="utf-8")
        return out

    async def _dsa_fix_plan(self, dl, task, files, out):
        """-> (prompt, only_file or None, mode, num_predict). On a MISMATCH, first ask which side is right,
        then repair only the wrong file instead of letting the model guess."""
        if m := MISMATCH_RE.search(out):
            inp, a, b = (g.strip() for g in m.groups())
            votes = re.findall(r"\b[AB]\b", await self._call(dl, JUDGE_SYS, p_judge(task, inp, a, b), "think", 3000) or "")
            if votes and votes[-1] == "A":      # solution is right, brute force is wrong
                note = f"For input {inp} brute.py returned {b} but the correct answer is {a}. Fix brute.py for every valid input."
                return p_file_fix(task, "brute.py", files["brute.py"], note), "brute.py", "fast", 3000
            if votes:                            # brute force is right, solution is wrong
                note = f"For input {inp} solution.py returned {a} but the correct answer is {b}. Fix solution.py for every valid input."
                return p_file_fix(task, "solution.py", files["solution.py"], note), "solution.py", "think", 4000
        return p_dsa_fix(task, files, out, room_chars(6000)), None, "think", 6000

    # ----- DSA tier -----
    async def _dsa(self, task: str, dl: Deadline):
        yield "status", "writing the solution (thinking)..."
        sol = await self._code(dl, p_solution(task), "solution.py", "think", 3000)
        if not sol:
            yield "final", "Could not get solution.py (empty or cut-off reply twice; thinking may have used the whole token budget)."
            return

        if err := validate_solution_api(sol):
            yield "status", f"solution API error: {err}"
            fixed = extract_one(await self._call(dl, CODE_SYS, p_solution_fix(task, sol, err), "think", 3000) or "",
                                "solution.py")
            if fixed and not validate_solution_api(fixed):    # never replace with something still invalid
                sol = fixed

        m = re.search(r"^def solve\([^\n]*\)[^\n]*:", sol, re.M)
        signature = m.group(0) if m else "def solve(...):"
        yield "status", "writing an independent brute force and input generator..."
        files = {"solution.py": sol}
        for name, prompt in (("brute.py", p_brute(task, signature)),
                             ("gen.py", p_gen(task, signature, solve_params(sol)))):
            if code := await self._code(dl, prompt, name, "fast", 2500):
                files[name] = strip_comments(code)
        if len(files) < 3:
            yield "final", f"Solution written but could not build {' and '.join(sorted(DSA_FILES - files.keys()))} for the brute-force check.\n\n{block('solution.py', sol, 'python')}"
            return

        passed, last = False, ""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            (d / "harness.py").write_text(HARNESS, encoding="utf-8")
            for attempt in range(1, FIX_ROUNDS + 2):
                for name, body in files.items():
                    (d / name).write_text(body, encoding="utf-8")
                bad = [n for n, b in files.items() if UNSAFE.search(b)]
                if err := precheck(files):
                    code, out = 1, err
                elif bad:
                    code, out = 1, f"forbidden import or call (os/subprocess/open/eval/...) in: {', '.join(bad)}"
                else:
                    code, out = await run_cmd([sys.executable, "harness.py", "300"], d, min(60, max(5, dl.left())))
                last = out
                if code == 0:
                    passed = True
                    break
                yield "status", f"attempt {attempt}: {out.strip().splitlines()[0] if out.strip() else 'failed'}"
                if attempt > FIX_ROUNDS or dl.expired():
                    break
                yield "status", "asking the model to fix it..."
                prompt, only, mode, npred = await self._dsa_fix_plan(dl, task, files, out)
                reply = await self._call(dl, CODE_SYS, prompt, mode, npred)
                if reply is None:
                    break
                fixed = parse_files(reply, {only} if only else DSA_FILES)
                if not fixed and (c := extract_one(reply, only or "solution.py")):
                    fixed = {only or "solution.py": c}
                if not fixed:
                    break
                files.update({n: strip_comments(b) if n != "solution.py" else b for n, b in fixed.items()})

        out_dir = self._save("dsa", files)
        note = ("Matched an independent brute-force version on 300 random inputs "
                "(this shows the two agree, not that both are right)." if passed
                else f"NOT fully verified. Last check output:\n{clip(last, 600)}")
        yield "final", f"{note}\n\n{TICKS}python\n{files['solution.py'].rstrip()}\n{TICKS}\n\nSaved to: {out_dir}"

    # ----- web tier -----
    async def _web(self, task: str, dl: Deadline):
        yield "status", "planning (ids, classes, functions)..."
        contract = await self._call(dl, PLAN_SYS, p_plan(task), "think", 3000)
        if not contract:
            yield "final", "Could not produce a plan before the time budget ran out."
            return
        contract = clip(contract.strip(), 2500)

        yield "status", "writing index.html..."
        html = await self._code(dl, p_html(task, contract), "index.html", "fast", 3500)
        if not html:
            yield "final", "Could not get index.html from the model."
            return
        html = ensure_links(html)
        room = room_chars(5000)

        yield "status", "writing style.css..."
        css = await self._code(dl, p_css(task, contract, clip(html, room // 2)), "style.css", "fast", 3000) or "/* empty */\n"
        yield "status", "writing script.js (thinking)..."
        js = await self._code(dl, p_js(task, contract, clip(html, room // 2)), "script.js", "think", 5000)
        if not js:
            yield "final", "Could not get script.js (empty or cut-off reply twice; thinking may have used the whole token budget)."
            return

        files = {"index.html": html, "style.css": css, "script.js": js}
        passed, errors, notes, seen = False, "", [], []
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            for attempt in range(1, FIX_ROUNDS + 2):
                for name, body in files.items():
                    (d / name).write_text(body, encoding="utf-8")
                errs, notes = await web_checks(d)
                if not errs:
                    passed = True
                    break
                errors = "\n".join(errs)
                yield "status", f"attempt {attempt}: {' '.join(errs[0].split())[-140:]}"
                if attempt > FIX_ROUNDS or dl.expired() or errors in seen:
                    break
                seen.append(errors)
                yield "status", "asking the model to fix it (thinking)..."
                reply = await self._call(dl, CODE_SYS, p_web_fix(task, contract, files, errors, room_chars(5000)),
                                         "think", 5000)
                if reply is None or not (fixed := parse_files(reply, WEB_FILES)):
                    break
                files.update(fixed)
                files["index.html"] = ensure_links(files["index.html"])

        out_dir = self._save("web", files)
        status = (f"Checks passed ({'; '.join(notes)})." if passed
                  else f"NOT fully verified. Last problems:\n{clip(errors, 700)}")
        blocks = "\n\n".join(f"### {n}\n{TICKS}{LANGS[n]}\n{files[n].rstrip()}\n{TICKS}" for n in LANGS)
        yield "final", f"{status}\n\n{blocks}\n\nSaved to: {out_dir}"


# ---------- try it from the command line ----------
async def _cli():
    from general import BaseWorker, INSTRUCT, THINK_CODE, M_CODER

    async def ask(system, prompt, mode="fast", num_predict=2048):
        think = mode == "think"
        worker = BaseWorker("CoderAgent", system, M_CODER, num_predict, think=think,
                            sampling=THINK_CODE if think else INSTRUCT)
        text, _ = await worker.run(prompt)
        return text

    task = " ".join(sys.argv[1:]) or "Write a function to reverse a linked list"
    async for kind, text in CodingAgent(ask).run(task):
        print(f"[{kind}] {text}\n")


if __name__ == "__main__":
    asyncio.run(_cli())