"""Start native development services and verify HTTP readiness. Run with backend/.venv/bin/python."""
import argparse
import os
from pathlib import Path
import signal
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ROOT / "runtime"
SERVICES = {
    "backend": (ROOT / "backend", [str(ROOT / "backend/.venv/bin/uvicorn"), "app.main:app", "--host", "0.0.0.0", "--port", "8000"], "http://127.0.0.1:8000/health"),
    "frontend": (ROOT / "frontend", ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"], "http://127.0.0.1:3000"),
}


def request_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            return response.status == 200
    except (OSError, TimeoutError):
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop", "status"])
    args = parser.parse_args()
    RUNTIME.mkdir(exist_ok=True)
    for name, (cwd, command, url) in SERVICES.items():
        pid_file = RUNTIME / f"{name}.pid"
        if args.action == "stop":
            if pid_file.exists():
                pid = int(pid_file.read_text())
                try:
                    # Only signal the process group started and recorded by this helper.
                    os.killpg(pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                stopped = time.monotonic()
                while request_ok(url):
                    if time.monotonic() - stopped > 10:
                        raise SystemExit(f"{name}: recorded service did not stop; inspect runtime/{name}.log")
                    time.sleep(0.2)
                pid_file.unlink()
            print(f"{name}: stopped recorded service")
        elif args.action == "status":
            print(f"{name}: {'responding' if request_ok(url) else 'not responding'}")
        else:
            if request_ok(url):
                print(f"{name}: already responding; leaving it running")
                continue
            environment = os.environ.copy()
            environment["BACKEND_URL"] = "http://127.0.0.1:8000"
            environment["npm_config_cache"] = str(RUNTIME / "cache/npm")
            with (RUNTIME / f"{name}.log").open("ab") as log:
                process = subprocess.Popen(command, cwd=cwd, env=environment, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            pid_file.write_text(str(process.pid))
            started = time.monotonic()
            while time.monotonic() - started < 55:
                if request_ok(url):
                    print(f"{name}: HTTP readiness passed")
                    break
                if process.poll() is not None:
                    raise SystemExit(f"{name} exited; inspect runtime/{name}.log")
                time.sleep(0.5)
            else:
                raise SystemExit(f"{name} not ready; inspect runtime/{name}.log")


if __name__ == "__main__":
    main()
