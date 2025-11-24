document.addEventListener("DOMContentLoaded", () => {

    // ====== INQUIRY FORM SUBMIT ======
    const form = document.getElementById("inquiryForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const full_name = document.getElementById("full_name").value;
            const email = document.getElementById("email").value;
            const contact_number = document.getElementById("contact_number").value;
            const requirement = document.getElementById("requirement").value;
            const message = document.getElementById("message").value;
            const files = document.getElementById("files").files;

            if (!full_name || !email || !contact_number || !requirement || !message) {
                alert("Please fill in all required fields.");
                return;
            }

            const formData = new FormData();
            formData.append("full_name", full_name);
            formData.append("email", email);
            formData.append("contact_number", contact_number);
            formData.append("requirement", requirement);
            formData.append("message", message);

            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }

            try {
                const response = await fetch("/api/inquiries", {
                    method: "POST",
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    alert("Inquiry sent successfully! We will contact you soon.");
                    form.reset();
                } else {
                    alert(result.message || "Submission failed.");
                }
            } catch (err) {
                console.error("Request failed:", err);
                alert("Server error while submitting inquiry.");
            }
        });
    }

    // ====== DYNAMIC SERVICES FROM DB ======
    async function loadServices() {
        const container = document.getElementById("servicesGrid");
        if (!container) return;

        try {
            const res = await fetch("/api/services");
            if (!res.ok) throw new Error("Failed to load services");
            const services = await res.json();

            container.innerHTML = "";

            if (!services.length) {
                container.innerHTML = "<p>No services available at the moment.</p>";
                return;
            }

            services.forEach(svc => {
                const card = document.createElement("article");
                card.className = "card";

                const img = document.createElement("img");
                img.src = `/api/services/${svc.service_id}/image`;
                img.alt = svc.image_alt || svc.title || "Service image";
                img.classList.add("zoomable");

                // open modal on click
                img.addEventListener("click", () => {
                    if (window.openImageModal) {
                        window.openImageModal(img.src, svc.title || svc.image_alt);
                    }
                });


                const h3 = document.createElement("h3");
                h3.textContent = svc.title;

                const p = document.createElement("p");
                p.textContent = svc.description || "";

                card.appendChild(img);
                card.appendChild(h3);
                card.appendChild(p);

                container.appendChild(card);
            });
        } catch (err) {
            console.error("Error loading services:", err);
            container.innerHTML = "<p>Unable to load services right now.</p>";
        }
    }

    // ====== DYNAMIC PROJECTS FROM DB ======
    async function loadProjects() {
    const container = document.getElementById("projectsGrid");
    if (!container) return;

    try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("Failed to load projects");
        const projects = await res.json();

        container.innerHTML = "";

        if (!projects.length) {
            container.innerHTML = "<p>No sample projects available at the moment.</p>";
            return;
        }

        projects.forEach(prj => {
            // Card style (pareho sa services)
            const card = document.createElement("article");
            card.className = "card gallery-item";

            // IMAGE
            const img = document.createElement("img");
            img.src = `/api/projects/${prj.project_id}/image`;
            img.alt = prj.image_alt || prj.title || "Project image";
            img.classList.add("zoomable");

            // Zoom popup
            img.addEventListener("click", () => {
                if (window.openImageModal) {
                    window.openImageModal(img.src, prj.title || prj.image_alt);
                }
            });

            // TITLE
            const h3 = document.createElement("h3");
            h3.textContent = prj.title || "Project";

            // DESCRIPTION
            const p = document.createElement("p");
            p.textContent = prj.description || "";

            card.appendChild(img);
            card.appendChild(h3);
            card.appendChild(p);

            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading projects:", err);
        container.innerHTML = "<p>Unable to load sample projects right now.</p>";
    }
}


    function setupImageModal() {
    const modal = document.getElementById("imageModal");
    if (!modal) return;

    const modalImg = document.getElementById("imageModalImg");
    const modalCaption = document.getElementById("imageModalCaption");
    const closeBtn = modal.querySelector(".image-modal-close");
    const backdrop = modal.querySelector(".image-modal-backdrop");

    function openModal(src, caption) {
        modalImg.src = src;
        modalCaption.textContent = caption || "";
        modal.classList.add("open");
    }

    function closeModal() {
        modal.classList.remove("open");
        modalImg.src = "";
        modalCaption.textContent = "";
    }

    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    });

    // para ma-access ng other functions (loadServices / loadProjects)
    window.openImageModal = openModal;
}

function setupSlider(targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    const wrapper = container.closest(".slider-wrapper");
    if (!wrapper) return;

    const leftBtn = wrapper.querySelector(".slider-arrow-left");
    const rightBtn = wrapper.querySelector(".slider-arrow-right");

    const getScrollAmount = () => container.clientWidth * 0.8;

    if (leftBtn) {
        leftBtn.addEventListener("click", () => {
            container.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener("click", () => {
            container.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
        });
    }

    // Basic swipe support (mouse/touch)
    let isPointerDown = false;
    let startX = 0;

    container.addEventListener("pointerdown", (e) => {
        isPointerDown = true;
        startX = e.clientX;
    });

    container.addEventListener("pointerup", (e) => {
        if (!isPointerDown) return;
        const diff = e.clientX - startX;
        const threshold = 50; // px

        if (Math.abs(diff) > threshold) {
            container.scrollBy({
                left: diff > 0 ? -getScrollAmount() : getScrollAmount(),
                behavior: "smooth"
            });
        }

        isPointerDown = false;
    });

    container.addEventListener("pointerleave", () => {
        isPointerDown = false;
    });

    container.addEventListener("pointercancel", () => {
        isPointerDown = false;
    });
}

    loadServices();
    loadProjects();

    setupSlider("servicesGrid");
    setupSlider("projectsGrid");
    setupImageModal();

    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});

