"""
Predictina - Natural-language property recommendation.

The user describes what they want in free text (price, surface, location,
amenities...). We parse that text with rule-based regex/keyword matching,
then live-search mubawab.tn (server-rendered, no JS needed) for matching
listings and rank them. Each result links back to the original mubawab.tn
ad - that's where the phone number / contact form lives, we don't scrape
phone numbers ourselves.
"""

import re
import unicodedata

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.mubawab.tn"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

CITY_SLUGS = {
    "tunis": "tunis", "sousse": "sousse", "sfax": "sfax", "bizerte": "bizerte",
    "nabeul": "nabeul", "monastir": "monastir", "hammamet": "hammamet",
    "kairouan": "kairouan", "gafsa": "gafsa", "gabes": "gabes", "tataouine": "tataouine",
    "ariana": "ariana", "la marsa": "la-marsa", "ben arous": "ben-arous",
    "manouba": "manouba", "kelibia": "kelibia", "djerba": "djerba",
    "mahdia": "mahdia", "zaghouan": "zaghouan", "beja": "beja",
}

AMENITY_KEYWORDS = {
    "piscine":       ["piscine", "pool"],
    "jardin":        ["jardin", "garden"],
    "parking":       ["parking", "garage"],
    "ascenseur":     ["ascenseur", "elevator"],
    "climatisation": ["climatisation", "climatise", "clim"],
    "securite":      ["securite", "securise", "gardien"],
    "terrasse":      ["terrasse"],
    "meuble":        ["meuble", "meublee"],
    "vue mer":       ["vue mer", "vue sur mer", "front de mer"],
}

PROPERTY_TYPE_HINTS = {
    "villa":     ["villa"],
    "apartment": ["appartement", "appart", "duplex", "studio"],
    "house":     ["maison"],
    "land":      ["terrain"],
    "office":    ["bureau", "local commercial"],
}

TRANSACTION_RENT_HINTS = ["louer", "location", "locative", "a louer"]

_RE_PRICE_CTX = re.compile(
    r"(?:max(?:imum)?|budget|jusqu.?a|pas plus de|moins de)\D{0,15}"
    r"(\d+(?:[.,]\d+)?)\s*(mille|k)?",
    re.IGNORECASE,
)
_RE_PRICE_ANY = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(mille|k)?\s*(?:dt|tnd|dinars?)",
    re.IGNORECASE,
)
_RE_SURFACE = re.compile(r"(\d{2,4})\s*m(?:2|²|etres?\s*carr)", re.IGNORECASE)
_RE_ROOMS = re.compile(r"(\d)\s*(?:pi[eè]ces?|chambres?)", re.IGNORECASE)
_RE_ROOMS_SNOTATION = re.compile(r"\bs\s*\+?\s*(\d)\b", re.IGNORECASE)


def _normalize(s):
    return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()


def _has_word(text_norm, keyword):
    """Whole-word match so 'appart' doesn't fire inside 'appartenant'."""
    return re.search(r"\b" + re.escape(keyword) + r"\b", text_norm) is not None


def _extract_price_max(t):
    m = _RE_PRICE_CTX.search(t) or _RE_PRICE_ANY.search(t)
    if not m:
        return None
    num = float(m.group(1).replace(",", "."))
    if m.group(2):
        num *= 1000
    return int(num)


def _extract_rooms(t):
    m = _RE_ROOMS.search(t) or _RE_ROOMS_SNOTATION.search(t)
    return int(m.group(1)) if m else None


def _detect_property_type(text_norm):
    for ptype, hints in PROPERTY_TYPE_HINTS.items():
        if any(_has_word(text_norm, h) for h in hints):
            return ptype
    # Tunisian listings often say "S2" / "S+3" instead of spelling out
    # "appartement" — treat that as an apartment signal too.
    if _RE_ROOMS_SNOTATION.search(text_norm):
        return "apartment"
    return None


def parse_preferences(text):
    t = _normalize(text or "")

    prefs = {
        "transaction_type": "rent" if any(_has_word(t, h) for h in TRANSACTION_RENT_HINTS) else "sale",
        "property_type": None,
        "city": None,
        "city_slug": None,
        "price_max": _extract_price_max(t),
        "surface_min": None,
        "rooms_min": None,
        "amenities": [],
    }

    prefs["property_type"] = _detect_property_type(t)

    for city_name, slug in CITY_SLUGS.items():
        if _has_word(t, city_name):
            prefs["city"] = city_name.title()
            prefs["city_slug"] = slug
            break

    m = _RE_SURFACE.search(t)
    if m:
        prefs["surface_min"] = int(m.group(1))

    prefs["rooms_min"] = _extract_rooms(t)

    prefs["amenities"] = [k for k, hints in AMENITY_KEYWORDS.items() if any(_has_word(t, h) for h in hints)]

    return prefs


def _parse_price_text(price_text):
    digits = re.findall(r"\d[\d\s  ]*\d|\d", price_text)
    if not digits:
        return None
    cleaned = re.sub(r"[^\d]", "", digits[0])
    return int(cleaned) if cleaned else None


def _parse_card(card):
    url = card.get("linkref")
    if not url:
        link = card.find("a", href=True)
        url = link["href"] if link else None
    if not url:
        return None
    if not url.startswith("http"):
        url = BASE_URL + url

    content = card.find("div", class_="contentBox") or card

    title_el = content.find("h2") or content.find("h1")
    title = title_el.get_text(strip=True) if title_el else "Annonce"

    price_el = content.find(class_=re.compile(r"priceTag"))
    price = _parse_price_text(price_el.get_text(" ", strip=True)) if price_el else None

    loc_el = content.find(class_=re.compile(r"listingH3"))
    location = re.sub(r"\s+", " ", loc_el.get_text(" ", strip=True)).strip() if loc_el else ""

    text_full = content.get_text(" ", strip=True)

    surface_m = re.search(r"(\d{2,4})\s*m(?:2|²)", text_full)
    surface = int(surface_m.group(1)) if surface_m else None

    text_norm = _normalize(text_full)
    title_norm = _normalize(title)
    rooms = _extract_rooms(title_norm) or _extract_rooms(text_norm)
    # Title only, never the description: mixed-use listings routinely
    # mention other property types in passing (e.g. a commercial lot
    # whose description says "comprend un appartement s2...") which
    # would mislabel the ad if we scanned the full text.
    property_type = _detect_property_type(title_norm)
    amenities = [k for k, hints in AMENITY_KEYWORDS.items() if any(_has_word(text_norm, h) for h in hints)]

    return {
        "title": title,
        "price": price,
        "location": location,
        "surface": surface,
        "rooms": rooms,
        "property_type": property_type,
        "amenities": amenities,
        "url": url,
    }


def fetch_listings(prefs, pages=3, timeout=12):
    city_slug = prefs.get("city_slug") or "tunis"
    action = "immobilier-a-louer" if prefs["transaction_type"] == "rent" else "immobilier-a-vendre"

    listings, seen_urls = [], set()

    for page in range(1, pages + 1):
        suffix = "" if page == 1 else f":p:{page}"
        url = f"{BASE_URL}/fr/ct/{city_slug}/{action}{suffix}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout)
        except requests.RequestException:
            break
        if resp.status_code != 200:
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.find_all("div", class_=re.compile(r"\blistingBox\b"))
        if not cards:
            break

        for card in cards:
            listing = _parse_card(card)
            if listing and listing["url"] not in seen_urls:
                seen_urls.add(listing["url"])
                listings.append(listing)

    return listings


def _score(listing, prefs):
    score = 0.0

    if listing["price"] is not None and prefs["price_max"]:
        if listing["price"] <= prefs["price_max"]:
            score += 3
        else:
            overage = (listing["price"] - prefs["price_max"]) / prefs["price_max"]
            score -= min(overage * 5, 5)

    if listing["surface"] is not None and prefs["surface_min"]:
        if listing["surface"] >= prefs["surface_min"]:
            score += 2
        else:
            deficit = (prefs["surface_min"] - listing["surface"]) / prefs["surface_min"]
            score -= deficit * 3

    if listing["rooms"] is not None and prefs["rooms_min"]:
        score += 1 if listing["rooms"] >= prefs["rooms_min"] else -1

    matched = set(listing["amenities"]) & set(prefs["amenities"])
    score += len(matched) * 1.5

    return score


def recommend(text, max_results=5):
    prefs = parse_preferences(text)
    listings = fetch_listings(prefs)

    if not listings:
        return {
            "preferences_detected": prefs,
            "results": [],
            "message": "Aucune annonce trouvee pour cette recherche. Essayez une autre ville ou reformulez votre demande.",
        }

    message = None
    candidates = listings
    if prefs["property_type"]:
        typed = [l for l in listings if l["property_type"] == prefs["property_type"]]
        if typed:
            candidates = typed
        else:
            message = (
                f"Aucune annonce de type '{prefs['property_type']}' trouvee a cet endroit — "
                "resultats elargis a tous les types de biens."
            )

    ranked = sorted(
        candidates,
        key=lambda l: (-_score(l, prefs), l["price"] if l["price"] is not None else float("inf")),
    )[:max_results]

    for listing in ranked:
        listing["matched_amenities"] = sorted(set(listing["amenities"]) & set(prefs["amenities"]))

    return {"preferences_detected": prefs, "results": ranked, "message": message}
