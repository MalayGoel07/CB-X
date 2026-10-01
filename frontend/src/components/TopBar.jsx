function TopBar() {
  return (
    <header className="flex items-center justify-between w-full bg-[#0a0f18]">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
        <h1 className="text-[22px] font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          CB-X
        </h1>
      </div>
    </header>
  );
}

export default TopBar;