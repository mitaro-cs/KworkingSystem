from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from functools import wraps
from typing import Any
from uuid import uuid4

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "coworking.db")
AVATAR_UPLOAD_DIR = os.path.join(APP_DIR, "static", "uploads", "avatars")
TUNA_PUBLIC_URL = "https://3o7ti2-185-191-118-25.ru.tuna.am"
ASSET_VERSION = os.environ.get("ASSET_VERSION", "20260216-05")
PUBLIC_URL = os.environ.get(
    "PUBLIC_URL",
    TUNA_PUBLIC_URL,
)
MIN_BOOKING_MINUTES = 30
AUTH_SHOWCASE_IMAGE = os.environ.get(
    "AUTH_SHOWCASE_IMAGE",
    "https://images.unsplash.com/photo-1631261545104-4e16dcf1c975?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
)
MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024
ALLOWED_IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
DEFAULT_THEME = "gray"
THEME_OPTIONS = {
    "light": "Светлая",
    "gray": "Серая",
    "black": "Черная",
    "blue": "Синяя",
    "green": "Зеленая",
    "purple": "Фиолетовая",
}
LEGACY_THEME_MAP = {
    "graphite": "black",
    "paper": "light",
    "ocean": "gray",
    "forest": "gray",
    "sand": "light",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NAME_RE = re.compile(r"^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\- ]{1,48}$")
NICKNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
STUDENT_ID_RE = re.compile(r"^\d[А-ЯЁ]{3}\d{5}$")
STUDENT_ID_HINT = "0БИН00000"

RULES = [
    "Подтвердите личность по номеру студенческого билета перед входом на спот.",
    "Соблюдайте тишину в учебных зонах и используйте наушники.",
    "Не оставляйте личные вещи без присмотра.",
    "После завершения бронирования освободите место вовремя.",
    "Соблюдайте чистоту и правила университета.",
]

SPOTS = [
    {
        "name": "A.101",
        "building": "Корпус A",
        "floor": "1",
        "zone": "Северное крыло",
        "capacity": 14,
        "description": "Открытый спот рядом с главным входом.",
    },
    {
        "name": "A.214",
        "building": "Корпус A",
        "floor": "2",
        "zone": "Библиотечный блок",
        "capacity": 10,
        "description": "Тихая зона для индивидуальной работы.",
    },
    {
        "name": "B.305",
        "building": "Корпус B",
        "floor": "3",
        "zone": "Проектная зона",
        "capacity": 16,
        "description": "Спот для командной работы и встреч.",
    },
    {
        "name": "C.118",
        "building": "Корпус C",
        "floor": "1",
        "zone": "Атриум",
        "capacity": 12,
        "description": "Светлое пространство с быстрым доступом к кофе-поинту.",
    },
    {
        "name": "D.402",
        "building": "Корпус B",
        "floor": "4",
        "zone": "Лабораторный сектор",
        "capacity": 9,
        "description": "Компактный спот для сфокусированной учебы.",
    },
]

SNACKS = [
    {
        "name": "Campus Cafe A",
        "building": "Корпус A",
        "floor": "1",
        "zone": "Северное крыло",
        "description": "Сэндвичи, салаты, кофе. До 21:00.",
        "spot_names": ["A.101", "A.214"],
    },
    {
        "name": "Coffee Lab A2",
        "building": "Корпус A",
        "floor": "2",
        "zone": "Переход к библиотеке",
        "description": "Эспрессо, чай, выпечка и быстрые десерты.",
        "spot_names": ["A.101", "A.214", "B.305"],
    },
    {
        "name": "Food Point B",
        "building": "Корпус B",
        "floor": "2",
        "zone": "Центральный блок",
        "description": "Горячие обеды и здоровые перекусы.",
        "spot_names": ["B.305", "D.402"],
    },
    {
        "name": "Atrium Kiosk",
        "building": "Корпус C",
        "floor": "1",
        "zone": "Атриум",
        "description": "Легкие закуски и напитки навынос.",
        "spot_names": ["C.118", "A.101"],
    },
    {
        "name": "Smart Bento B4",
        "building": "Корпус B",
        "floor": "4",
        "zone": "Рядом с лифтами",
        "description": "Бенто-наборы, роллы и вода.",
        "spot_names": ["B.305", "D.402"],
    },
    {
        "name": "Lab Snack 24",
        "building": "Корпус B",
        "floor": "4",
        "zone": "Лабораторный сектор",
        "description": "Вендинг: батончики, орехи, холодные напитки.",
        "spot_names": ["D.402", "B.305"],
    },
    {
        "name": "Green Bar C",
        "building": "Корпус C",
        "floor": "1",
        "zone": "Атриум",
        "description": "Смузи, фрукты, легкие боулы.",
        "spot_names": ["C.118", "A.214"],
    },
    {
        "name": "Tea Point Library",
        "building": "Корпус A",
        "floor": "2",
        "zone": "Библиотечный блок",
        "description": "Чайная стойка с сэндвичами и печеньем.",
        "spot_names": ["A.214", "C.118"],
    },
    {
        "name": "Fresh Box Hub",
        "building": "Корпус B",
        "floor": "1",
        "zone": "Переход между корпусами",
        "description": "Готовые наборы: салаты, супы, йогурты.",
        "spot_names": ["A.101", "B.305", "C.118"],
    },
    {
        "name": "Soup Corner Central",
        "building": "Корпус C",
        "floor": "2",
        "zone": "Центральная галерея",
        "description": "Суп дня, тосты и горячий чай.",
        "spot_names": ["D.402", "C.118"],
    },
]

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = os.environ.get("COWORKING_SECRET", os.urandom(32).hex())
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def db_time(dt: datetime) -> str:
    return dt.replace(microsecond=0).strftime("%Y-%m-%d %H:%M:%S")


def parse_client_datetime(raw_value: str) -> datetime | None:
    if not raw_value:
        return None
    try:
        dt = datetime.fromisoformat(raw_value)
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt


def normalize_student_id(raw_value: str) -> str:
    # Allow spaces and dashes in input, keep canonical format in DB.
    return str(raw_value).strip().upper().replace(" ", "").replace("-", "")


def is_local_avatar_path(avatar_url: str | None) -> bool:
    return bool(avatar_url and avatar_url.startswith("/static/uploads/avatars/"))


def init_db() -> None:
    Path(AVATAR_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript(
            f"""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                nickname TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                student_id TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                avatar_url TEXT,
                theme TEXT NOT NULL DEFAULT '{DEFAULT_THEME}',
                favorite_spot_id INTEGER,
                rules_acknowledged INTEGER NOT NULL DEFAULT 0,
                is_admin INTEGER NOT NULL DEFAULT 0,
                is_owner INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (favorite_spot_id) REFERENCES spots(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS spots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                building TEXT NOT NULL,
                floor TEXT NOT NULL,
                zone TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                description TEXT NOT NULL,
                is_open INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS snack_places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                building TEXT NOT NULL,
                floor TEXT NOT NULL,
                zone TEXT NOT NULL,
                description TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS snack_spot_map (
                snack_id INTEGER NOT NULL,
                spot_id INTEGER NOT NULL,
                PRIMARY KEY (snack_id, spot_id),
                FOREIGN KEY (snack_id) REFERENCES snack_places(id) ON DELETE CASCADE,
                FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                spot_id INTEGER NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'booked',
                checked_in INTEGER NOT NULL DEFAULT 0,
                checked_in_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
            );
            """
        )

        user_columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()
        }
        if "rules_acknowledged" not in user_columns:
            conn.execute(
                "ALTER TABLE users ADD COLUMN rules_acknowledged INTEGER NOT NULL DEFAULT 0"
            )
        if "is_admin" not in user_columns:
            conn.execute(
                "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"
            )
        if "is_owner" not in user_columns:
            conn.execute(
                "ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0"
            )

        seeded_spot_names = {spot["name"] for spot in SPOTS}
        existing_spot_names = {
            row["name"]
            for row in conn.execute("SELECT name FROM spots").fetchall()
        }
        for spot in SPOTS:
            if spot["name"] in existing_spot_names:
                conn.execute(
                    """
                    UPDATE spots
                    SET building = ?,
                        floor = ?,
                        zone = ?,
                        capacity = ?,
                        description = ?,
                        is_open = 1
                    WHERE name = ?
                    """,
                    (
                        spot["building"],
                        spot["floor"],
                        spot["zone"],
                        spot["capacity"],
                        spot["description"],
                        spot["name"],
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO spots(name, building, floor, zone, capacity, description, is_open)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                    """,
                    (
                        spot["name"],
                        spot["building"],
                        spot["floor"],
                        spot["zone"],
                        spot["capacity"],
                        spot["description"],
                    ),
                )

        placeholders = ",".join("?" for _ in seeded_spot_names)
        conn.execute(
            f"UPDATE spots SET is_open = CASE WHEN name IN ({placeholders}) THEN 1 ELSE 0 END",
            tuple(sorted(seeded_spot_names)),
        )

        conn.execute("DELETE FROM snack_spot_map")
        conn.execute("DELETE FROM snack_places")
        for snack in SNACKS:
            cursor = conn.execute(
                """
                INSERT INTO snack_places(name, building, floor, zone, description)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    snack["name"],
                    snack["building"],
                    snack["floor"],
                    snack["zone"],
                    snack["description"],
                ),
            )
            snack_id = cursor.lastrowid
            for spot_name in snack["spot_names"]:
                spot_row = conn.execute(
                    "SELECT id FROM spots WHERE name = ? AND is_open = 1",
                    (spot_name,),
                ).fetchone()
                if spot_row:
                    conn.execute(
                        "INSERT OR IGNORE INTO snack_spot_map(snack_id, spot_id) VALUES (?, ?)",
                        (snack_id, spot_row["id"]),
                    )

        conn.execute("UPDATE users SET theme = LOWER(theme) WHERE theme IS NOT NULL")
        for old_theme, new_theme in LEGACY_THEME_MAP.items():
            conn.execute(
                "UPDATE users SET theme = ? WHERE theme = ?",
                (new_theme, old_theme),
            )

        allowed_themes = tuple(THEME_OPTIONS.keys())
        placeholders_theme = ",".join("?" for _ in allowed_themes)
        conn.execute(
            "UPDATE users SET theme = ? WHERE theme IS NULL OR theme = ''",
            (DEFAULT_THEME,),
        )
        conn.execute(
            f"UPDATE users SET theme = ? WHERE theme NOT IN ({placeholders_theme})",
            (DEFAULT_THEME, *allowed_themes),
        )
        conn.execute(
            """
            UPDATE users
            SET favorite_spot_id = NULL
            WHERE favorite_spot_id IS NOT NULL
              AND favorite_spot_id NOT IN (SELECT id FROM spots WHERE is_open = 1)
            """
        )

        open_spots_count = conn.execute(
            "SELECT COUNT(*) AS count FROM spots WHERE is_open = 1"
        ).fetchone()["count"]
        if open_spots_count == 0:
            for spot in SPOTS:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO spots(name, building, floor, zone, capacity, description, is_open)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                    """,
                    (
                        spot["name"],
                        spot["building"],
                        spot["floor"],
                        spot["zone"],
                        spot["capacity"],
                        spot["description"],
                    ),
                )


def serialize_user(row: sqlite3.Row) -> dict[str, Any]:
    theme = (row["theme"] or "").lower()
    if theme not in THEME_OPTIONS:
        theme = DEFAULT_THEME
    return {
        "id": row["id"],
        "email": row["email"],
        "nickname": row["nickname"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "student_id": row["student_id"],
        "avatar_url": row["avatar_url"],
        "theme": theme,
        "favorite_spot_id": row["favorite_spot_id"],
        "rules_acknowledged": bool(row["rules_acknowledged"]),
    }


def current_user() -> dict[str, Any] | None:
    user_id = session.get("user_id")
    if not user_id:
        return None
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT id, email, nickname, first_name, last_name, student_id, avatar_url, theme, favorite_spot_id, rules_acknowledged
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
    if not row:
        session.clear()
        return None
    return serialize_user(row)


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"ok": False, "error": "Требуется авторизация."}), 401
        return func(user, *args, **kwargs)

    return wrapper


def validation_error(message: str, status: int = 400):
    return jsonify({"ok": False, "error": message}), status


@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers[
        "Content-Security-Policy"
    ] = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self';"
    return response


@app.get("/")
def index():
    user = current_user()
    if not user:
        return redirect(url_for("auth_page"))
    return render_template(
        "index.html",
        bootstrap_user=user,
        student_id_hint=STUDENT_ID_HINT,
        rules=RULES,
        min_booking_minutes=MIN_BOOKING_MINUTES,
        asset_version=ASSET_VERSION,
    )


@app.get("/auth")
def auth_page():
    user = current_user()
    if user:
        return redirect(url_for("index"))
    return render_template(
        "auth.html",
        auth_showcase_image=AUTH_SHOWCASE_IMAGE,
        student_id_hint=STUDENT_ID_HINT,
        asset_version=ASSET_VERSION,
    )


@app.get("/api/rules")
def api_rules():
    return jsonify({"ok": True, "rules": RULES})


@app.post("/api/register")
def api_register():
    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip().lower()
    nickname = str(payload.get("nickname", "")).strip()
    first_name = str(payload.get("first_name", "")).strip()
    last_name = str(payload.get("last_name", "")).strip()
    student_id = normalize_student_id(payload.get("student_id", ""))
    password = str(payload.get("password", ""))

    if not EMAIL_RE.match(email):
        return validation_error("Введите корректный email.")
    if not NICKNAME_RE.match(nickname):
        return validation_error("Никнейм: 3-32 символа, только латиница, цифры и _.-")
    if not NAME_RE.match(first_name) or not NAME_RE.match(last_name):
        return validation_error("Укажите реальные имя и фамилию.")
    if not STUDENT_ID_RE.match(student_id):
        return validation_error(f"Формат студбилета: {STUDENT_ID_HINT}.")
    if len(password) < 8:
        return validation_error("Пароль должен содержать минимум 8 символов.")

    password_hash = generate_password_hash(password)

    # Grant admin and owner rights if the email matches
    is_admin = email == "miri.saro@bk.ru"
    is_owner = email == "miri.saro@bk.ru"

    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT email, nickname, student_id FROM users
            WHERE email = ? OR nickname = ? OR student_id = ?
            """,
            (email, nickname, student_id),
        ).fetchall()
        if existing:
            return validation_error("Пользователь с таким email, никнеймом или студбилетом уже существует.", 409)

        cursor = conn.execute(
            """
            INSERT INTO users(email, nickname, first_name, last_name, student_id, password_hash, created_at, is_admin, is_owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (email, nickname, first_name, last_name, student_id, password_hash, db_time(datetime.now()), is_admin, is_owner),
        )
        user_id = cursor.lastrowid

    session["user_id"] = user_id
    return jsonify({"ok": True, "message": "Регистрация выполнена."})


@app.post("/api/login")
def api_login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return validation_error("Введите email и пароль.")

    # Allow password visibility during login
    print(f"Password entered: {password}")

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT id, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if not row or not check_password_hash(row["password_hash"], password):
        return validation_error("Неверные учетные данные.", 401)

    session["user_id"] = row["id"]
    return jsonify({"ok": True, "message": "Вход выполнен."})


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
@login_required
def api_me(user):
    with get_db() as conn:
        total_minutes = conn.execute(
            """
            SELECT COALESCE(SUM((julianday(end_at) - julianday(start_at)) * 24 * 60), 0) AS total_minutes
            FROM bookings
            WHERE user_id = ? AND status = 'booked'
            """,
            (user["id"],),
        ).fetchone()["total_minutes"]

    user["booked_minutes"] = int(total_minutes)
    return jsonify({"ok": True, "user": user})


@app.get("/api/spots")
@login_required
def api_spots(_user):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                s.id,
                s.name,
                s.building,
                s.floor,
                s.zone,
                s.capacity,
                s.description,
                s.is_open,
                COALESCE(COUNT(b.id), 0) AS active_count
            FROM spots s
            LEFT JOIN bookings b
                ON b.spot_id = s.id
                AND b.status = 'booked'
                AND datetime('now', 'localtime') BETWEEN b.start_at AND b.end_at
            WHERE s.is_open = 1
            GROUP BY s.id
            ORDER BY s.name ASC
            """
        ).fetchall()

    spots = [dict(row) for row in rows]
    return jsonify({"ok": True, "spots": spots})


@app.get("/api/snacks/<int:spot_id>")
@login_required
def api_snacks(_user, spot_id: int):
    with get_db() as conn:
        snack_rows = conn.execute(
            """
            SELECT p.id, p.name, p.building, p.floor, p.zone, p.description
            FROM snack_places p
            JOIN snack_spot_map m ON m.snack_id = p.id
            WHERE m.spot_id = ?
            ORDER BY p.name
            """,
            (spot_id,),
        ).fetchall()

    return jsonify({"ok": True, "snacks": [dict(row) for row in snack_rows]})


@app.get("/api/bookings")
@login_required
def api_bookings(user):
    mine_only = request.args.get("mine", "1") != "0"

    with get_db() as conn:
        if mine_only:
            rows = conn.execute(
                """
                SELECT
                    b.id,
                    b.user_id,
                    b.spot_id,
                    s.name AS spot_name,
                    s.building,
                    b.start_at,
                    b.end_at,
                    b.status,
                    b.checked_in,
                    b.checked_in_at,
                    b.created_at
                FROM bookings b
                JOIN spots s ON s.id = b.spot_id
                WHERE b.user_id = ?
                ORDER BY b.start_at DESC
                """,
                (user["id"],),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT
                    b.id,
                    b.user_id,
                    b.spot_id,
                    s.name AS spot_name,
                    s.building,
                    b.start_at,
                    b.end_at,
                    b.status,
                    b.checked_in,
                    b.checked_in_at,
                    b.created_at
                FROM bookings b
                JOIN spots s ON s.id = b.spot_id
                ORDER BY b.start_at DESC
                """
            ).fetchall()

    now = datetime.now()
    result = []
    for row in rows:
        item = dict(row)
        start_dt = datetime.strptime(item["start_at"], "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(item["end_at"], "%Y-%m-%d %H:%M:%S")
        if end_dt < now:
            state = "completed"
        elif start_dt <= now <= end_dt:
            state = "active"
        else:
            state = "upcoming"
        item["state"] = state
        item["minutes_left"] = max(0, int((end_dt - now).total_seconds() // 60))
        result.append(item)

    return jsonify({"ok": True, "bookings": result})


@app.post("/api/bookings")
@login_required
def api_create_booking(user):
    payload = request.get_json(silent=True) or {}

    try:
        spot_id = int(payload.get("spot_id", 0))
    except (TypeError, ValueError):
        return validation_error("Выберите корректный спот.")

    start_raw = str(payload.get("start_at", "")).strip()
    end_raw = str(payload.get("end_at", "")).strip()

    start_dt = parse_client_datetime(start_raw)
    end_dt = parse_client_datetime(end_raw)

    if not start_dt or not end_dt:
        return validation_error("Введите корректные дату и время бронирования.")
    if end_dt <= start_dt:
        return validation_error("Время окончания должно быть позже начала.")
    if start_dt < datetime.now() - timedelta(minutes=5):
        return validation_error("Нельзя бронировать слот в прошлом времени.")
    if end_dt - start_dt < timedelta(minutes=MIN_BOOKING_MINUTES):
        return validation_error(
            f"Минимальная длительность бронирования: {MIN_BOOKING_MINUTES} минут."
        )
    if end_dt - start_dt > timedelta(hours=6):
        return validation_error("Максимальная длительность одного бронирования: 6 часов.")

    start_at = db_time(start_dt)
    end_at = db_time(end_dt)

    with get_db() as conn:
        spot = conn.execute(
            "SELECT id, capacity, is_open FROM spots WHERE id = ?",
            (spot_id,),
        ).fetchone()
        if not spot or spot["is_open"] != 1:
            return validation_error("Спот недоступен для бронирования.", 404)

        own_overlap = conn.execute(
            """
            SELECT 1
            FROM bookings
            WHERE user_id = ?
              AND status = 'booked'
              AND NOT (? >= end_at OR ? <= start_at)
            LIMIT 1
            """,
            (user["id"], start_at, end_at),
        ).fetchone()
        if own_overlap:
            return validation_error("У вас уже есть пересекающееся бронирование.", 409)

        spot_overlap_count = conn.execute(
            """
            SELECT COUNT(*) AS overlap_count
            FROM bookings
            WHERE spot_id = ?
              AND status = 'booked'
              AND NOT (? >= end_at OR ? <= start_at)
            """,
            (spot_id, start_at, end_at),
        ).fetchone()["overlap_count"]

        if spot_overlap_count >= spot["capacity"]:
            return validation_error("На выбранное время мест больше нет.", 409)

        cursor = conn.execute(
            """
            INSERT INTO bookings(user_id, spot_id, start_at, end_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user["id"], spot_id, start_at, end_at, db_time(datetime.now())),
        )

    return jsonify({"ok": True, "booking_id": cursor.lastrowid, "message": "Бронирование создано."})


@app.post("/api/bookings/<int:booking_id>/check-in")
@login_required
def api_check_in(user, booking_id: int):
    payload = request.get_json(silent=True) or {}
    student_id = normalize_student_id(payload.get("student_id", ""))
    accepted_rules = bool(payload.get("accepted_rules", False))

    if student_id != user["student_id"]:
        return validation_error("Номер студенческого билета не совпадает с профилем.", 403)
    if not accepted_rules:
        return validation_error("Для входа на спот нужно принять правила.", 400)

    with get_db() as conn:
        booking = conn.execute(
            """
            SELECT id, start_at, end_at, checked_in
            FROM bookings
            WHERE id = ? AND user_id = ? AND status = 'booked'
            """,
            (booking_id, user["id"]),
        ).fetchone()
        if not booking:
            return validation_error("Бронирование не найдено.", 404)

        start_dt = datetime.strptime(booking["start_at"], "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(booking["end_at"], "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        if now < start_dt - timedelta(minutes=30) or now > end_dt:
            return validation_error("Вход на спот доступен за 30 минут до старта и до конца бронирования.")

        if booking["checked_in"] == 1:
            return jsonify({"ok": True, "message": "Вход уже подтвержден."})

        conn.execute(
            """
            UPDATE bookings
            SET checked_in = 1,
                checked_in_at = ?
            WHERE id = ?
            """,
            (db_time(now), booking_id),
        )

    return jsonify({"ok": True, "message": "Вход на спот подтвержден."})


@app.post("/api/profile")
@login_required
def api_profile(user):
    payload = request.get_json(silent=True) or {}

    theme = payload.get("theme", user["theme"])
    has_avatar_update = "avatar_url" in payload
    has_favorite_update = "favorite_spot_id" in payload
    avatar_url = payload.get("avatar_url", user["avatar_url"]) if has_avatar_update else user["avatar_url"]
    favorite_spot_id = (
        payload.get("favorite_spot_id", user["favorite_spot_id"])
        if has_favorite_update
        else user["favorite_spot_id"]
    )

    if theme not in THEME_OPTIONS:
        return validation_error("Некорректная тема.")

    if has_avatar_update and avatar_url is not None:
        avatar_url = str(avatar_url).strip()
        if avatar_url and not is_local_avatar_path(avatar_url):
            return validation_error("Аватар можно установить только через загрузку файла.")
        if not avatar_url:
            avatar_url = None

    if has_favorite_update:
        if favorite_spot_id in ("", None):
            favorite_spot_id = None
        else:
            try:
                favorite_spot_id = int(favorite_spot_id)
            except (TypeError, ValueError):
                return validation_error("Некорректный идентификатор избранного пространства.")

    with get_db() as conn:
        if has_favorite_update and favorite_spot_id is not None:
            spot = conn.execute(
                "SELECT id FROM spots WHERE id = ? AND is_open = 1",
                (favorite_spot_id,),
            ).fetchone()
            if not spot:
                return validation_error("Указанное избранное пространство не найдено.", 404)

        conn.execute(
            """
            UPDATE users
            SET theme = ?,
                avatar_url = ?,
                favorite_spot_id = ?
            WHERE id = ?
            """,
            (theme, avatar_url, favorite_spot_id, user["id"]),
        )

    return jsonify({"ok": True, "message": "Профиль обновлен."})


@app.post("/api/avatar")
@login_required
def api_avatar_upload(user):
    avatar_file = request.files.get("avatar")
    if not avatar_file:
        return validation_error("Выберите файл аватара.")
    if not avatar_file.filename:
        return validation_error("Файл аватара не выбран.")

    safe_name = secure_filename(avatar_file.filename)
    file_ext = Path(safe_name).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        return validation_error("Поддерживаются форматы: PNG, JPG, WEBP, GIF.")

    mime_type = (avatar_file.mimetype or "").lower()
    if mime_type and mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        return validation_error("Недопустимый тип изображения.")

    avatar_file.stream.seek(0, os.SEEK_END)
    file_size = avatar_file.stream.tell()
    avatar_file.stream.seek(0)
    if file_size <= 0:
        return validation_error("Файл аватара пустой.")
    if file_size > MAX_AVATAR_FILE_SIZE:
        return validation_error("Максимальный размер аватара: 2 МБ.")

    filename = f"user_{user['id']}_{uuid4().hex}{file_ext}"
    target_path = os.path.join(AVATAR_UPLOAD_DIR, filename)
    avatar_file.save(target_path)
    avatar_url = f"/static/uploads/avatars/{filename}"

    with get_db() as conn:
        old_avatar_url = conn.execute(
            "SELECT avatar_url FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()["avatar_url"]
        conn.execute(
            "UPDATE users SET avatar_url = ? WHERE id = ?",
            (avatar_url, user["id"]),
        )

    if is_local_avatar_path(old_avatar_url) and old_avatar_url != avatar_url:
        old_path = os.path.join(APP_DIR, old_avatar_url.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    return jsonify({"ok": True, "avatar_url": avatar_url, "message": "Аватар обновлен."})


@app.post("/api/rules/ack")
@login_required
def api_rules_ack(user):
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET rules_acknowledged = 1 WHERE id = ?",
            (user["id"],),
        )
    return jsonify({"ok": True, "message": "Правила подтверждены."})


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Public URL: {PUBLIC_URL}")
    print(f"Local URL: http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
