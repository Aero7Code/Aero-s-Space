"""Build an allowlisted GitHub Pages artifact from the static site."""
from html.parser import HTMLParser
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"
PAGES = ("index.html", "about.html", "services.html", "info.html", "contact.html", "account.html")
ASSETS = ("Script.js", "Account.js", "StyleSheet.css", "CNAME")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class PageCheck(HTMLParser):
    def __init__(self):
        super().__init__()
        self.has_csp = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if any(name.startswith("on") for name in attributes):
            raise ValueError(f"Inline event handler in {tag}")
        if tag == "script" and "src" not in attributes:
            raise ValueError("Inline script is not allowed")
        if tag == "meta" and attributes.get("http-equiv", "").lower() == "content-security-policy":
            self.has_csp = True


if OUTPUT.is_symlink():
    raise ValueError("Refusing to replace a symlinked build directory")
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
OUTPUT.mkdir()

for name in PAGES:
    source = ROOT / name
    content = source.read_text(encoding="utf-8")
    check = PageCheck()
    check.feed(content)
    if not check.has_csp or "localhost" in content.lower():
        raise ValueError(f"Unsafe page: {name}")
    shutil.copy2(source, OUTPUT / name)

for name in ASSETS:
    shutil.copy2(ROOT / name, OUTPUT / name)

images = OUTPUT / "images"
images.mkdir()
for source in (ROOT / "images").iterdir():
    if source.is_symlink() or not source.is_file():
        raise ValueError(f"Unexpected image entry: {source.name}")
    if source.suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(f"Unsupported image type: {source.name}")
    shutil.copy2(source, images / source.name)

print(f"Built {OUTPUT} with {len(PAGES)} pages and {len(list(images.iterdir()))} images")
