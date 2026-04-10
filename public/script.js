// ===============================
// CONFIG
// ===============================
const API = "https://hostel-complaint-system-xbhg.onrender.com/api";
let currentUser = localStorage.getItem("currentUser");

// ===============================
// LOGIN PAGE
// ===============================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("regNumber").value.trim();
        const password = document.getElementById("password").value.trim();

        fetch(`${API}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(user => {
            localStorage.setItem("currentUser", user.username);

            if (user.username === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "student.html";
            }
        })
        .catch(err => {
            alert("Login failed");
            console.error(err);
        });
    });
}

// ===============================
// STUDENT DASHBOARD
// ===============================
const complaintForm = document.getElementById("complaintForm");
const complaintList = document.getElementById("complaintList");

if (complaintForm) {

    if (!currentUser) {
        window.location.href = "index.html";
    }

    // Submit complaint
    complaintForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const category = document.getElementById("category").value;
        const description = document.getElementById("description").value.trim();

        fetch(`${API}/complaints`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: currentUser,
                category,
                description,
                date: new Date().toLocaleString()
            })
        })
        .then(() => {
            alert("Complaint submitted!");
            loadComplaints();
            complaintForm.reset();
        })
        .catch(err => console.error(err));
    });

    // Load complaints on page open
    window.onload = loadComplaints;

    // Auto refresh ONLY for student
    setInterval(loadComplaints, 3000);
}

// ===============================
// LOAD STUDENT COMPLAINTS
// ===============================
function loadComplaints() {
    fetch(`${API}/complaints`)
    .then(res => res.json())
    .then(data => {
        if (!complaintList) return;

        complaintList.innerHTML = "";

        const myComplaints = data.filter(c => c.username === currentUser);

        if (myComplaints.length === 0) {
            complaintList.innerHTML = "<li>No complaints yet</li>";
            return;
        }

        myComplaints.forEach(c => {
            const li = document.createElement("li");

            let color =
                c.status === "Resolved" ? "green" :
                c.status === "In Progress" ? "orange" : "red";

            li.innerHTML = `
                <strong>${c.category}</strong><br>
                ${c.description}<br>
                <span style="color:${color}; font-weight:500;">
                    Status: ${c.status}
                </span><br>
                <small>${c.date}</small>
            `;

            complaintList.appendChild(li);
        });
    })
    .catch(err => console.error(err));
}

// ===============================
// ADMIN DASHBOARD (FIXED 🔥)
// ===============================
const adminTable = document.getElementById("adminTable");

if (adminTable) {

    if (currentUser !== "admin") {
        alert("Unauthorized");
        window.location.href = "index.html";
    }

    // Load once ONLY (no auto refresh ❌)
    loadAdminComplaints();
}

// Load admin complaints
function loadAdminComplaints() {
    fetch(`${API}/complaints`)
    .then(res => res.json())
    .then(data => {
        adminTable.innerHTML = "";

        if (data.length === 0) {
            adminTable.innerHTML = `
                <tr>
                    <td colspan="5">No complaints</td>
                </tr>
            `;
            return;
        }

        data.forEach(c => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${c.username}</td>
                <td>${c.category}</td>
                <td>${c.description}</td>
                <td>${c.status}</td>
                <td>
                    <select id="status-${c.id}">
                        <option ${c.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option ${c.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option ${c.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                    <button onclick="updateStatus(${c.id})">Update</button>
                </td>
            `;

            adminTable.appendChild(row);
        });
    })
    .catch(err => console.error(err));
}

// ===============================
// UPDATE STATUS
// ===============================
function updateStatus(id) {
    const newStatus = document.getElementById(`status-${id}`).value;

    fetch(`${API}/complaints/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => res.json())
    .then(() => {
        alert("Status updated!");
        loadAdminComplaints(); // refresh manually
    })
    .catch(err => console.error(err));
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}