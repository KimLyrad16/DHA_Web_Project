// assets/js/admin-inquiries.js

let inquiries = [];
let currentInquiryId = null;

async function loadInquiries() {
    try {
        const res = await fetch("/api/admin/inquiries");
        const data = await res.json();
        inquiries = data;
        renderInquiryList();
    } catch (err) {
        console.error("Error loading inquiries:", err);
        alert("Error loading inquiries from server.");
    }
}

function renderInquiryList() {
    const tbody = document.querySelector("#tblInquiries tbody");
    tbody.innerHTML = "";

    for (const inq of inquiries) {
        const tr = document.createElement("tr");
        tr.dataset.id = inq.inquiry_id;

        const createdDate = inq.created_at
            ? new Date(inq.created_at).toLocaleString()
            : "";

        tr.innerHTML = `
            <td>${inq.full_name}</td>
            <td>${inq.requirement}</td>
            <td>${inq.status}</td>
            <td>${createdDate}</td>
        `;

        tr.addEventListener("click", () => {
            selectInquiry(inq.inquiry_id);
        });

        tbody.appendChild(tr);
    }

    if (inquiries.length === 0) {
        document.getElementById("noSelection").style.display = "block";
        document.getElementById("details").style.display = "none";
    }
}

async function selectInquiry(id) {
    currentInquiryId = id;

    // highlight row
    document.querySelectorAll("#tblInquiries tbody tr").forEach(row => {
        row.classList.toggle("selected", Number(row.dataset.id) === id);
    });

    const inq = inquiries.find(x => x.inquiry_id === id);
    if (!inq) return;

    document.getElementById("noSelection").style.display = "none";
    document.getElementById("details").style.display = "block";

    document.getElementById("dFullName").textContent = inq.full_name;
    document.getElementById("dEmail").textContent = inq.email;
    document.getElementById("dContact").textContent = inq.contact_number;
    document.getElementById("dRequirement").textContent = inq.requirement;
    document.getElementById("dMessage").textContent = inq.message;
    document.getElementById("dStatus").textContent = inq.status;
    document.getElementById("dCreatedAt").textContent = inq.created_at
        ? new Date(inq.created_at).toLocaleString()
        : "";

    await loadFiles(id);
}

async function loadFiles(inquiryId) {
    const tbody = document.querySelector("#tblFiles tbody");
    tbody.innerHTML = "";

    try {
        const res = await fetch(`/api/admin/inquiries/${inquiryId}/files`);
        const files = await res.json();

        if (!files || files.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5" class="small" style="color:#6b7280;">No attachments.</td>`;
            tbody.appendChild(tr);
            return;
        }

        for (const f of files) {
            const tr = document.createElement("tr");

            const uploaded = f.CreatedAt
                ? new Date(f.CreatedAt).toLocaleString()
                : "";

            tr.innerHTML = `
                <td>${f.OriginalName}</td>
                <td>${f.FileExt}</td>
                <td>${f.FileSizeBytes}</td>
                <td>${uploaded}</td>
                <td><button data-id="${f.FileID}" class="btnDownload small">Download</button></td>
            `;

            tbody.appendChild(tr);
        }

        tbody.querySelectorAll(".btnDownload").forEach(btn => {
            btn.addEventListener("click", () => {
                const fileId = btn.getAttribute("data-id");
                window.open(`/api/admin/inquiries/file/${fileId}`, "_blank");
            });
        });

    } catch (err) {
        console.error("Error loading files:", err);
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" class="small" style="color:#b91c1c;">Error loading files.</td>`;
        tbody.appendChild(tr);
    }
}

async function updateStatus(status) {
    if (!currentInquiryId) {
        alert("Select an inquiry first.");
        return;
    }

    try {
        const res = await fetch(`/api/admin/inquiries/${currentInquiryId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Error updating status.");
        }

        await loadInquiries();
        selectInquiry(currentInquiryId);
    } catch (err) {
        console.error("Error updating status:", err);
        alert("Error updating status.");
    }
}

async function deleteInquiry() {
    if (!currentInquiryId) {
        alert("Select an inquiry first.");
        return;
    }

    if (!confirm("Delete this inquiry and all attachments?")) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/inquiries/${currentInquiryId}`, {
            method: "DELETE"
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Error deleting inquiry.");
        }

        currentInquiryId = null;
        await loadInquiries();

        document.getElementById("noSelection").style.display = "block";
        document.getElementById("details").style.display = "none";
    } catch (err) {
        console.error("Error deleting inquiry:", err);
        alert("Error deleting inquiry.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadInquiries();

    document.getElementById("btnMarkRead").addEventListener("click", () => {
        updateStatus("read");
    });

    document.getElementById("btnMarkClosed").addEventListener("click", () => {
        updateStatus("closed");
    });

    document.getElementById("btnDelete").addEventListener("click", () => {
        deleteInquiry();
    });

    document.getElementById("btnRefresh").addEventListener("click", () => {
        loadInquiries();
    });
});
