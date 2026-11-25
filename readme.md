# ∞ OpenCircle — Learn • Share • Grow

**OpenCircle** is an intergenerational community learning and mentorship web application built with **Python (Flask)**, **SQLite**, and **Vanilla JavaScript**. It connects curious learners with subject-matter practitioners, structured multi-week courses, and senior citizens sharing decades of lived wisdom.

---

## Key Features

- **12 Knowledge Domains:** Explore mentors across *Academics & Education, Philosophy & Wisdom, Vedas & Heritage, Drawing & Visual Arts, Music & Instruments, Dance & Performance, Technology & Coding, Business & Career, Languages & Literature, Sports & Fitness, Cooking & Food,* and *Traditional Skills*.
- **Senior Citizens & Life Experience Spotlight:** A dedicated section highlighting retired professors, veterans, home chefs, and traditional artisans offering free or low-cost mentorship.
- **Role-Based Authentication:** Separate portals and workspaces for **Students** and **Teachers / Senior Mentors** powered by `werkzeug.security` password hashing and Flask sessions.
- **Mentor-Hosted Live Video & Voice Rooms:** Mentors can confirm session requests to automatically generate a private **Jitsi Meet** room (`Video Meet` or `Voice Call`), or launch instant rooms directly from their dashboard.
- **Long-Term Structured Courses:** Multi-week academic and technical tracks with week-by-week syllabus breakdowns and one-click dashboard enrollment.
- **Quick Ask Community Q&A:** A peer-and-mentor question board where students ask questions and verified teachers/elders publish answers.
- **Single-Page Experience with Browser History:** Smooth client-side view switching integrated with the browser History API (`pushState` / `popstate`) and on-screen `← Back` navigation.

---

## Project Structure

```text
opencircle/
├── app.py                  # Flask backend, REST API endpoints, and SQLite auto-migration
├── opencircle.db           # Auto-generated SQLite database (created on first run)
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Main application UI and modals
└── static/
    ├── logo.png            # OpenCircle brand logo & favicon
    ├── style.css           # Responsive custom design system
    └── script.js           # Client-side state, API integration, and Meet launcher
```

---

## Setup & Local Installation

### 1. Prerequisites
- Python **3.9+** installed on your system.

### 2. Install Dependencies
Open a terminal inside the `opencircle/` project folder and install Flask:

```bash
pip install flask werkzeug
```

### 3. Run the Application
Start the Flask development server:

```bash
python app.py
```

The app will automatically initialize `opencircle.db` with sample mentors, courses, bookings, and community Q&A posts.

### 4. Open in Browser
Visit **`http://127.0.0.1:5000`** in your browser.

---

## One-Click Demo Accounts

Click **Student Login** or **Teacher Login** in the top navigation bar to use the built-in one-click demo buttons, or sign in manually with:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Student** | Aarav Verma | `student@opencircle.demo` | `demo1234` |
| **Teacher (Coding)** | Dev Malhotra | `teacher@opencircle.demo` | `demo1234` |
| **Senior Mentor** | Prof. Subhash Kulkarni | `senior@opencircle.demo` | `demo1234` |

---

## API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/me` | Fetch currently authenticated user session |
| `POST` | `/api/register` / `/api/login` | Register or sign in as a `student` or `teacher` |
| `GET` / `POST` | `/api/teachers` | Search/filter mentors or publish a new listing |
| `PUT` / `DELETE` | `/api/teachers/<id>` | Update or remove a mentor's own listing |
| `GET` | `/api/courses` | List structured multi-week courses |
| `POST` | `/api/courses/<id>/enroll` | Enroll logged-in user in a course |
| `POST` | `/api/bookings` | Send a 1-on-1 session request to a mentor |
| `PATCH` | `/api/bookings/<id>` | Confirm/decline/cancel a booking & auto-create Meet room |
| `POST` | `/api/bookings/<id>/meet` | Generate a private Jitsi Meet room for a confirmed session |
| `GET` / `POST` | `/api/questions` | View or post community Q&A questions |

---

## License & Disclaimer

Built as an educational prototype. Sample mentor profiles, pricing, and session listings included in the seed database are illustrative demo data.