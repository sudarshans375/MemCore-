@echo off
REM AI Memory System v2.0 - Global CLI Wrapper
REM Usage: aimemory [command]
REM Commands: init, status, history, decisions, tasks, summary, track, file, decision, task, shutdown

node "%~dp0ai-memory.js" %*
