@echo off
setlocal
rem The proxy crashes when NO_PROXY contains a bracketed IPv6 literal on some
rem httpx builds; the bridge talks to loopback only, so clear it here.
set "NO_PROXY="
set "no_proxy="
echo Headroom proxy on http://127.0.0.1:8790 - close this window to stop it.
headroom proxy --port 8790
