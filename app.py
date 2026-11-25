from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import secrets
from pathlib import Path
from functools import wraps

app = Flask(__name__)
app.secret_key = "opencircle-buildathon-2026-secret-key"
DB_PATH = Path(__file__).with_name("opencircle.db")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    with db() as conn:
        user = conn.execute(
            "SELECT id, name, email, role, bio FROM users WHERE id = ?", (uid,)
        ).fetchone()
    return dict(user) if user else None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify(error="Please sign in to continue."), 401
        return fn(*args, **kwargs)
    return wrapper


def init_db():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            bio TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            experience TEXT DEFAULT '',
            mode TEXT DEFAULT 'Online',
            location TEXT DEFAULT 'Online',
            price TEXT DEFAULT '',
            bio TEXT DEFAULT '',
            is_senior INTEGER DEFAULT 0,
            senior_tag TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            learner_id INTEGER,
            learner_name TEXT NOT NULL,
            learner_email TEXT NOT NULL,
            teacher_id INTEGER NOT NULL,
            session_type TEXT DEFAULT 'One-to-one',
            message TEXT DEFAULT '',
            teacher_reply TEXT DEFAULT '',
            meet_room TEXT DEFAULT '',
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (learner_id) REFERENCES users(id),
            FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        );
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            teacher TEXT NOT NULL,
            duration TEXT DEFAULT '8 weeks',
            level TEXT DEFAULT 'Beginner to Intermediate',
            mode TEXT DEFAULT 'Online',
            price TEXT DEFAULT '',
            description TEXT DEFAULT '',
            syllabus TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            progress TEXT DEFAULT 'Week 1 · Enrolled',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
        CREATE TABLE IF NOT EXISTS saved_teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            teacher_id INTEGER NOT NULL,
            UNIQUE(user_id, teacher_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        );
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            author_role TEXT DEFAULT 'student',
            subject TEXT NOT NULL,
            question_text TEXT NOT NULL,
            answer_text TEXT DEFAULT '',
            answered_by TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Auto-migrate existing DB if meet_room column was missing
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(bookings)").fetchall()]
        if "meet_room" not in cols:
            conn.execute("ALTER TABLE bookings ADD COLUMN meet_room TEXT DEFAULT ''")

        if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            pw = generate_password_hash("demo1234")
            cur_s = conn.execute(
                "INSERT INTO users(name, email, password_hash, role, bio) VALUES(?,?,?,?,?)",
                ("Aarav Verma", "student@opencircle.demo", pw, "student", "BCA student exploring Python, Mathematics, and sketching.")
            )
            student_uid = cur_s.lastrowid

            cur_t = conn.execute(
                "INSERT INTO users(name, email, password_hash, role, bio) VALUES(?,?,?,?,?)",
                ("Dev Malhotra", "teacher@opencircle.demo", pw, "teacher", "Senior software engineer mentoring students in Python and web systems.")
            )
            dev_uid = cur_t.lastrowid

            cur_sr = conn.execute(
                "INSERT INTO users(name, email, password_hash, role, bio) VALUES(?,?,?,?,?)",
                ("Prof. Subhash Kulkarni", "senior@opencircle.demo", pw, "teacher", "Retired Head of Mathematics (38 years) sharing pure math intuition and life guidance.")
            )
            senior_uid = cur_sr.lastrowid

            teachers_seed = [
                # Senior Citizens / Life Experience Mentors
                (senior_uid, "Prof. Subhash Kulkarni", "Academics & Education", "38 years teaching (Retd. HOD)",
                 "Online and Nearby", "Pune & Online", "Free / volunteer",
                 "Retired university mathematics professor helping students overcome math anxiety with crystal-clear intuition, calculus foundations, and career guidance.",
                 1, "Retired Professor · 38 Yrs Wisdom"),
                (None, "Savitri Devi", "Cooking & Food", "45 years home culinary heritage",
                 "Online and Nearby", "Jaipur & Online", "₹199 / session",
                 "Grandmother and traditional cook preserving slow-cooked Rajasthani and North Indian recipes, spice blending, and zero-waste kitchen wisdom.",
                 1, "Elder Artisan · Culinary Heritage"),
                (None, "Col. Harpreet Singh (Retd.)", "Business & Career", "32 years leadership & service",
                 "Online", "Chandigarh & Online", "Free / mentorship",
                 "Retired army officer mentoring young graduates on discipline, ethical leadership, public speaking, and navigating life transitions.",
                 1, "Veteran Mentor · Life & Leadership"),
                (None, "Narayanacharya Joshi", "Vedas & Heritage", "40 years Sanskrit & Vedic study",
                 "Online", "Varanasi & Online", "Free / contribution",
                 "Senior Sanskrit scholar introducing learners to Upanishadic philosophy, Sanskrit pronunciation, and classical Indian texts with historical clarity.",
                 1, "Senior Scholar · Heritage & Sanskrit"),

                # All 12 Knowledge Categories
                (dev_uid, "Dev Malhotra", "Technology & Coding", "10 years software engineering",
                 "Online", "Bengaluru & Online", "₹499 / session",
                 "Mentors students in Python programming, data structures, backend APIs, and building real-world portfolio projects.",
                 0, ""),
                (None, "Ananya Mehta", "Drawing & Visual Arts", "8 years art education",
                 "Online and Nearby", "New Delhi & Online", "₹349 / session",
                 "Helps beginners build confidence with observational sketching, perspective, watercolour, and visual storytelling.",
                 0, ""),
                (None, "Raghav Iyer", "Philosophy & Wisdom", "12 years independent study",
                 "Online", "Chennai & Online", "Free / contribution",
                 "Facilitates accessible, thought-provoking discussions on Indian and Western philosophy, logic, and everyday ethics.",
                 0, ""),
                (None, "Kabir Khan", "Music & Instruments", "9 years performing & teaching",
                 "Online and Nearby", "Mumbai & Online", "₹449 / session",
                 "Teaches acoustic guitar, rhythm, chord progressions, and songwriting tailored to the songs each learner loves.",
                 0, ""),
                (None, "Nandini Nair", "Dance & Performance", "11 years classical & contemporary",
                 "Online and Nearby", "Kochi & Online", "₹399 / session",
                 "Guides beginners in rhythm, posture, expressive movement, and foundational Kathak and contemporary dance techniques.",
                 0, ""),
                (None, "Farah Ali", "Languages & Literature", "7 years language coaching",
                 "Online", "Lucknow & Online", "₹299 / session",
                 "Conversational fluency in Hindi, Urdu, and English, plus creative writing and literature appreciation.",
                 0, ""),
                (None, "Arjun Rao", "Sports & Fitness", "7 years athletic coaching",
                 "Nearby", "Bengaluru (Indiranagar)", "₹250 / session",
                 "Runs beginner-friendly neighbourhood football drills, mobility training, and endurance conditioning.",
                 0, ""),
                (None, "Meera Krishnan", "Traditional Skills", "14 years handloom & pottery",
                 "Nearby", "Mysuru & Online", "₹399 / session",
                 "Preserves traditional terracotta pottery and natural-dye weaving through hands-on weekend workshops.",
                 0, "")
            ]

            conn.executemany(
                """INSERT INTO teachers(user_id, name, subject, experience, mode, location, price, bio, is_senior, senior_tag)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                teachers_seed
            )

            conn.execute(
                """INSERT INTO bookings(learner_id, learner_name, learner_email, teacher_id, session_type, message, status)
                   VALUES(?,?,?,?,?,?,?)""",
                (student_uid, "Aarav Verma", "student@opencircle.demo", 5, "Video Meet (One-to-one)",
                 "Looking for guidance on structuring my first Flask + SQLite web project.", "Pending")
            )
            conn.execute(
                """INSERT INTO bookings(learner_id, learner_name, learner_email, teacher_id, session_type, message, teacher_reply, meet_room, status)
                   VALUES(?,?,?,?,?,?,?,?,?)""",
                (student_uid, "Aarav Verma", "student@opencircle.demo", 1, "Video Meet (One-to-one)",
                 "Would love help understanding limits and derivatives intuitively.",
                 "Confirmed! Meet room is open — join whenever you're ready.",
                 "OpenCircle-CalculusSession-101", "Confirmed")
            )

        if conn.execute("SELECT COUNT(*) FROM courses").fetchone()[0] == 0:
            courses_seed = [
                ("Long-Term Track: Mathematics from Algebra to Calculus", "Academics & Education",
                 "Prof. Subhash Kulkarni", "12 weeks · 24 live sessions", "Foundation to Advanced", "Online", "Free (Senior Volunteer)",
                 "A structured semester-length mathematics programme building deep conceptual mastery in functions, trigonometry, limits, differential calculus, and problem-solving.",
                 "Weeks 1–3: Algebraic Structures & Functions | Weeks 4–6: Trigonometry & Coordinate Geometry | Weeks 7–9: Limits, Continuity & Derivatives | Weeks 10–12: Integration & Real-World Modelling"),
                ("Long-Term Track: Full-Stack Python & Backend Engineering", "Technology & Coding",
                 "Dev Malhotra", "10 weeks · 20 live sessions", "Beginner to Job-Ready", "Online", "₹2,499",
                 "Master Python fundamentals, object-oriented design, SQL databases, REST APIs, and deploy a complete capstone web application.",
                 "Weeks 1–2: Core Python & Data Structures | Weeks 3–4: OOP & File Handling | Weeks 5–7: SQLite, Flask APIs & Authentication | Weeks 8–10: Testing, Deployment & Capstone Review"),
                ("Long-Term Track: Applied Physics & Analytical Thinking", "Academics & Education",
                 "Prof. Subhash Kulkarni", "8 weeks · 16 live sessions", "High School & Undergrad", "Online", "₹999",
                 "Build strong intuition in mechanics, electromagnetism, and mathematical modelling through guided derivations and weekly problem sets.",
                 "Weeks 1–2: Kinematics & Newtonian Mechanics | Weeks 3–4: Work, Energy & Rotational Motion | Weeks 5–6: Electrostatics & Circuits | Weeks 7–8: Waves, Optics & Capstone Problems"),
                ("Sketching & Visual Observation Studio", "Drawing & Visual Arts",
                 "Ananya Mehta", "6 weeks · 12 live sessions", "Beginner", "Online", "₹1,499",
                 "Develop confident hand-eye coordination, proportion, light and shadow, and personal sketchbook habits.",
                 "Weeks 1–2: Line Confidence & Basic Forms | Weeks 3–4: Perspective & Shading | Weeks 5–6: Portraits, Nature & Final Portfolio"),
                ("Foundations of Indian & World Philosophy", "Philosophy & Wisdom",
                 "Raghav Iyer", "6 weeks · 6 group circles", "Open to all", "Online", "Free / contribution",
                 "Explore timeless questions of ethics, consciousness, logic, and purpose across Upanishadic, Buddhist, and Stoic traditions.",
                 "Week 1: What is Knowledge? | Week 2: Ethics & Dharma | Week 3: Stoicism & Resilience | Week 4: Logic & Fallacies | Weeks 5–6: Modern Dilemmas"),
                ("Sanskrit & Classical Heritage: First Steps", "Vedas & Heritage",
                 "Narayanacharya Joshi", "8 weeks · 16 live sessions", "Beginner", "Online", "₹1,199",
                 "Learn Devanagari script, Sanskrit phonetics, foundational grammar, and read selected verses with historical context.",
                 "Weeks 1–2: Phonetics & Script | Weeks 3–4: Noun & Verb Roots | Weeks 5–6: Simple Verse Translation | Weeks 7–8: Classical Texts Overview")
            ]
            conn.executemany(
                """INSERT INTO courses(title, subject, teacher, duration, level, mode, price, description, syllabus)
                   VALUES(?,?,?,?,?,?,?,?,?)""",
                courses_seed
            )

        if conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0] == 0:
            conn.executemany(
                """INSERT INTO questions(author_name, author_role, subject, question_text, answer_text, answered_by)
                   VALUES(?,?,?,?,?,?)""",
                [
                    ("Aarav Verma", "student", "Academics & Education",
                     "How do I stop memorizing calculus formulas and actually understand what derivatives represent?",
                     "Start by plotting everyday change—like speed on a road trip. A derivative is simply your speedometer reading at one exact instant rather than your average speed over the whole trip.",
                     "Prof. Subhash Kulkarni (Senior Mentor)"),
                    ("Sneha R.", "student", "Technology & Coding",
                     "Should I learn plain SQL before jumping into ORMs like SQLAlchemy?",
                     "Yes! Writing raw SELECT, JOIN, and INSERT queries for a few weeks builds mental clarity that saves hours of debugging later.",
                     "Dev Malhotra (Software Engineer)")
                ]
            )


@app.get("/")
def home():
    return render_template("index.html")


# --- AUTH ROUTES ---

@app.get("/api/me")
def get_me():
    return jsonify(user=current_user())


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = data.get("role", "student")
    if role not in ("student", "teacher"):
        role = "student"
    bio = str(data.get("bio", "")).strip()

    if not name or not email or len(password) < 6:
        return jsonify(error="Please enter your name, email, and a password (at least 6 characters)."), 400

    with db() as conn:
        if conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
            return jsonify(error="An account with this email already exists."), 409
        cur = conn.execute(
            "INSERT INTO users(name, email, password_hash, role, bio) VALUES(?,?,?,?,?)",
            (name, email, generate_password_hash(password), role, bio)
        )
        session["user_id"] = cur.lastrowid

    return jsonify(message="Account created!", user=current_user()), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    expected_role = data.get("expected_role", "")

    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify(error="Invalid email or password."), 401

    if expected_role and user["role"] != expected_role:
        return jsonify(error=f"This account is registered as a {user['role']}. Switch tabs to sign in as a {user['role']}."), 403

    session["user_id"] = user["id"]
    return jsonify(message="Signed in successfully.", user=current_user())


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Signed out.")


# --- TEACHERS ---

@app.get("/api/teachers")
def get_teachers():
    q = request.args.get("q", "").strip()
    subject = request.args.get("subject", "").strip()
    mode = request.args.get("mode", "").strip()
    senior_only = request.args.get("senior", "").strip() == "1"

    sql = "SELECT * FROM teachers WHERE 1=1"
    params = []
    if q:
        sql += " AND (name LIKE ? OR subject LIKE ? OR bio LIKE ? OR location LIKE ?)"
        params += [f"%{q}%"] * 4
    if subject:
        sql += " AND subject = ?"
        params.append(subject)
    if mode and mode != "All":
        sql += " AND (mode = ? OR mode = 'Online and Nearby')"
        params.append(mode)
    if senior_only:
        sql += " AND is_senior = 1"
    sql += " ORDER BY is_senior DESC, id DESC"

    with db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/teachers")
@login_required
def create_teacher():
    user = current_user()
    if user["role"] != "teacher":
        return jsonify(error="Only Teacher accounts can publish teaching listings."), 403

    data = request.get_json(silent=True) or {}
    if not str(data.get("name", "")).strip() or not str(data.get("subject", "")).strip():
        return jsonify(error="Please provide your display name and subject."), 400

    is_senior = 1 if data.get("is_senior") else 0
    senior_tag = str(data.get("senior_tag", "")).strip() or ("Senior Mentor · Life Experience" if is_senior else "")

    with db() as conn:
        cur = conn.execute(
            """INSERT INTO teachers(user_id, name, subject, experience, mode, location, price, bio, is_senior, senior_tag)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (
                user["id"],
                data["name"].strip(),
                data["subject"].strip(),
                data.get("experience", "").strip(),
                data.get("mode", "Online"),
                data.get("location", "Online").strip() or "Online",
                data.get("price", "").strip(),
                data.get("bio", "").strip(),
                is_senior,
                senior_tag
            )
        )
        teacher_id = cur.lastrowid
    return jsonify(message="Teacher listing published.", id=teacher_id), 201


@app.put("/api/teachers/<int:teacher_id>")
@login_required
def update_teacher(teacher_id):
    data = request.get_json(silent=True) or {}
    if not str(data.get("name", "")).strip() or not str(data.get("subject", "")).strip():
        return jsonify(error="Name and subject are required."), 400

    uid = session["user_id"]
    is_senior = 1 if data.get("is_senior") else 0
    senior_tag = str(data.get("senior_tag", "")).strip() or ("Senior Mentor · Life Experience" if is_senior else "")

    with db() as conn:
        row = conn.execute("SELECT user_id FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
        if not row:
            return jsonify(error="Teacher listing not found."), 404
        if row["user_id"] != uid:
            return jsonify(error="You can only edit your own listings."), 403

        conn.execute(
            """UPDATE teachers
               SET name = ?, subject = ?, experience = ?, mode = ?, location = ?, price = ?, bio = ?, is_senior = ?, senior_tag = ?
               WHERE id = ?""",
            (
                data["name"].strip(),
                data["subject"].strip(),
                data.get("experience", "").strip(),
                data.get("mode", "Online"),
                data.get("location", "Online").strip() or "Online",
                data.get("price", "").strip(),
                data.get("bio", "").strip(),
                is_senior,
                senior_tag,
                teacher_id
            )
        )
    return jsonify(message="Teacher listing updated.")


@app.delete("/api/teachers/<int:teacher_id>")
@login_required
def delete_teacher(teacher_id):
    uid = session["user_id"]
    with db() as conn:
        row = conn.execute("SELECT user_id FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
        if not row:
            return jsonify(error="Teacher listing not found."), 404
        if row["user_id"] != uid:
            return jsonify(error="You can only delete your own listings."), 403

        conn.execute("DELETE FROM bookings WHERE teacher_id = ?", (teacher_id,))
        conn.execute("DELETE FROM saved_teachers WHERE teacher_id = ?", (teacher_id,))
        conn.execute("DELETE FROM teachers WHERE id = ?", (teacher_id,))
    return jsonify(message="Teacher listing deleted.")


# --- COURSES & ENROLLMENTS ---

@app.get("/api/courses")
def get_courses():
    q = request.args.get("q", "").strip()
    subject = request.args.get("subject", "").strip()
    sql = "SELECT * FROM courses WHERE 1=1"
    params = []
    if q:
        sql += " AND (title LIKE ? OR subject LIKE ? OR description LIKE ?)"
        params += [f"%{q}%"] * 3
    if subject:
        sql += " AND subject = ?"
        params.append(subject)
    sql += " ORDER BY id ASC"
    with db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/courses/<int:course_id>/enroll")
@login_required
def enroll_course(course_id):
    uid = session["user_id"]
    with db() as conn:
        course = conn.execute("SELECT id, title FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not course:
            return jsonify(error="Course not found."), 404
        existing = conn.execute(
            "SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ?", (uid, course_id)
        ).fetchone()
        if existing:
            return jsonify(message="You are already enrolled in this course!")
        conn.execute(
            "INSERT INTO course_enrollments(user_id, course_id) VALUES(?,?)", (uid, course_id)
        )
    return jsonify(message=f"Enrolled in {course['title']}!"), 201


@app.delete("/api/enrollments/<int:enrollment_id>")
@login_required
def drop_enrollment(enrollment_id):
    uid = session["user_id"]
    with db() as conn:
        conn.execute("DELETE FROM course_enrollments WHERE id = ? AND user_id = ?", (enrollment_id, uid))
    return jsonify(message="Removed course from your dashboard.")


# --- SAVED TEACHERS ---

@app.post("/api/saved/<int:teacher_id>")
@login_required
def toggle_saved_teacher(teacher_id):
    uid = session["user_id"]
    with db() as conn:
        existing = conn.execute(
            "SELECT id FROM saved_teachers WHERE user_id = ? AND teacher_id = ?", (uid, teacher_id)
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM saved_teachers WHERE id = ?", (existing["id"],))
            return jsonify(saved=False, message="Removed from saved mentors.")
        conn.execute("INSERT INTO saved_teachers(user_id, teacher_id) VALUES(?,?)", (uid, teacher_id))
        return jsonify(saved=True, message="Saved mentor to your dashboard!")


# --- BOOKINGS, MENTOR-ONLY MEET CREATION & DASHBOARD ---

@app.post("/api/bookings")
@login_required
def create_booking():
    data = request.get_json(silent=True) or {}
    user = current_user()
    teacher_id = data.get("teacher_id")
    if not teacher_id:
        return jsonify(error="Teacher is required."), 400

    with db() as conn:
        teacher = conn.execute("SELECT id, user_id FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
        if not teacher:
            return jsonify(error="Teacher not found."), 404
        if teacher["user_id"] == user["id"]:
            return jsonify(error="You cannot book your own listing."), 400

        cur = conn.execute(
            """INSERT INTO bookings(learner_id, learner_name, learner_email, teacher_id, session_type, message, status)
               VALUES(?,?,?,?,?,?,?)""",
            (
                user["id"],
                str(data.get("learner_name") or user["name"]).strip(),
                str(data.get("learner_email") or user["email"]).strip(),
                teacher_id,
                data.get("session_type", "Video Meet (One-to-one)"),
                data.get("message", "").strip(),
                "Pending"
            )
        )
    return jsonify(message="Session request sent!", id=cur.lastrowid), 201


@app.post("/api/bookings/<int:booking_id>/meet")
@login_required
def create_meet_room(booking_id):
    user = current_user()
    if user["role"] != "teacher":
        return jsonify(error="Only mentors can create meeting rooms."), 403

    with db() as conn:
        booking = conn.execute("""
            SELECT b.id, b.meet_room, t.user_id AS teacher_owner_id
            FROM bookings b
            JOIN teachers t ON t.id = b.teacher_id
            WHERE b.id = ?
        """, (booking_id,)).fetchone()

        if not booking:
            return jsonify(error="Booking not found."), 404
        if booking["teacher_owner_id"] != user["id"]:
            return jsonify(error="Only the assigned mentor can create this meeting room."), 403

        room_name = booking["meet_room"]
        if not room_name:
            room_name = f"OpenCircle-Meet-{booking_id}-{secrets.token_hex(3).upper()}"
            conn.execute(
                "UPDATE bookings SET status = 'Confirmed', meet_room = ? WHERE id = ?",
                (room_name, booking_id)
            )

    return jsonify(message="Meet room created and shared with student!", meet_room=room_name)


@app.get("/api/dashboard")
@login_required
def get_dashboard():
    uid = session["user_id"]
    with db() as conn:
        incoming = conn.execute("""
            SELECT b.*, t.name AS teacher_name, t.subject
            FROM bookings b
            JOIN teachers t ON t.id = b.teacher_id
            WHERE t.user_id = ?
            ORDER BY b.id DESC
        """, (uid,)).fetchall()

        outgoing = conn.execute("""
            SELECT b.*, t.name AS teacher_name, t.subject
            FROM bookings b
            JOIN teachers t ON t.id = b.teacher_id
            WHERE b.learner_id = ?
            ORDER BY b.id DESC
        """, (uid,)).fetchall()

        my_teachers = conn.execute(
            "SELECT * FROM teachers WHERE user_id = ? ORDER BY id DESC", (uid,)
        ).fetchall()

        enrollments = conn.execute("""
            SELECT e.id AS enrollment_id, e.progress, c.*
            FROM course_enrollments e
            JOIN courses c ON c.id = e.course_id
            WHERE e.user_id = ?
            ORDER BY e.id DESC
        """, (uid,)).fetchall()

        saved = conn.execute("""
            SELECT t.*
            FROM saved_teachers s
            JOIN teachers t ON t.id = s.teacher_id
            WHERE s.user_id = ?
            ORDER BY s.id DESC
        """, (uid,)).fetchall()

    return jsonify(
        incoming=[dict(r) for r in incoming],
        outgoing=[dict(r) for r in outgoing],
        my_teachers=[dict(r) for r in my_teachers],
        enrollments=[dict(r) for r in enrollments],
        saved=[dict(r) for r in saved]
    )


@app.patch("/api/bookings/<int:booking_id>")
@login_required
def update_booking_status(booking_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "")
    reply = str(data.get("teacher_reply", "")).strip()
    if new_status not in ("Confirmed", "Declined", "Cancelled"):
        return jsonify(error="Invalid status."), 400

    uid = session["user_id"]
    with db() as conn:
        booking = conn.execute("""
            SELECT b.id, b.learner_id, b.meet_room, t.user_id AS teacher_owner_id
            FROM bookings b
            JOIN teachers t ON t.id = b.teacher_id
            WHERE b.id = ?
        """, (booking_id,)).fetchone()

        if not booking:
            return jsonify(error="Booking not found."), 404

        is_teacher_owner = booking["teacher_owner_id"] == uid
        is_learner = booking["learner_id"] == uid

        if new_status in ("Confirmed", "Declined") and not is_teacher_owner:
            return jsonify(error="Only the teacher can confirm or decline this request."), 403
        if new_status == "Cancelled" and not (is_learner or is_teacher_owner):
            return jsonify(error="You cannot cancel this booking."), 403

        room_name = booking["meet_room"]
        if new_status == "Confirmed" and is_teacher_owner and not room_name:
            room_name = f"OpenCircle-Meet-{booking_id}-{secrets.token_hex(3).upper()}"

        if reply:
            conn.execute(
                "UPDATE bookings SET status = ?, teacher_reply = ?, meet_room = ? WHERE id = ?",
                (new_status, reply, room_name, booking_id)
            )
        else:
            conn.execute(
                "UPDATE bookings SET status = ?, meet_room = ? WHERE id = ?",
                (new_status, room_name, booking_id)
            )

    return jsonify(message=f"Booking marked as {new_status}.", meet_room=room_name)


@app.delete("/api/bookings/<int:booking_id>")
@login_required
def delete_booking(booking_id):
    uid = session["user_id"]
    with db() as conn:
        booking = conn.execute("""
            SELECT b.id, b.learner_id, t.user_id AS teacher_owner_id
            FROM bookings b
            JOIN teachers t ON t.id = b.teacher_id
            WHERE b.id = ?
        """, (booking_id,)).fetchone()

        if not booking:
            return jsonify(error="Booking not found."), 404
        if uid not in (booking["learner_id"], booking["teacher_owner_id"]):
            return jsonify(error="Not authorized to delete this booking."), 403

        conn.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
    return jsonify(message="Booking removed.")


# --- QUICK ASK COMMUNITY Q&A ---

@app.get("/api/questions")
def get_questions():
    with db() as conn:
        rows = conn.execute("SELECT * FROM questions ORDER BY id DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/questions")
@login_required
def post_question():
    user = current_user()
    data = request.get_json(silent=True) or {}
    q_text = str(data.get("question_text", "")).strip()
    subject = str(data.get("subject", "General")).strip()
    if not q_text:
        return jsonify(error="Please write a question first."), 400

    with db() as conn:
        conn.execute(
            "INSERT INTO questions(author_name, author_role, subject, question_text) VALUES(?,?,?,?)",
            (user["name"], user["role"], subject, q_text)
        )
    return jsonify(message="Question posted to the community board!"), 201


@app.post("/api/questions/<int:q_id>/answer")
@login_required
def answer_question(q_id):
    user = current_user()
    if user["role"] != "teacher":
        return jsonify(error="Only registered teachers or senior mentors can post answers."), 403

    data = request.get_json(silent=True) or {}
    ans = str(data.get("answer_text", "")).strip()
    if not ans:
        return jsonify(error="Please enter an answer."), 400

    with db() as conn:
        conn.execute(
            "UPDATE questions SET answer_text = ?, answered_by = ? WHERE id = ?",
            (ans, user["name"], q_id)
        )
    return jsonify(message="Answer published!")


if __name__ == "__main__":
    init_db()
    app.run(debug=True)