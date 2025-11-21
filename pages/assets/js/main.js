// Set current year in footer
document.addEventListener("DOMContentLoaded", () => {
    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const form = document.getElementById("inquiryForm");
    if (form) {
        const status = document.getElementById("formStatus");

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            if (status) {
                status.style.color = "#16a34a";
                status.textContent = "Thank you! We received your inquiry.";
            }

            // Simple message box
            alert("Inquiry sent! We will contact you soon.");

            // Redirect to dashboard/thank-you page after a short delay
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);
        });
    }
});
