$(document).ready(function () {
    // Create new user
    $("#createUserBtn").on("click", () => {
        window.location.href = "/admin/users/create";
    });

    // Edit user
    $(".edit-btn").on("click", function () {
        const userId = $(this).data("id");
        window.location.href = `/admin/users/${userId}/edit`;
    });

    // Delete user
    $(".delete-btn").on("click", function () {
        const userId = $(this).data("id");

        if (!confirm("Are you sure you want to delete this user?")) return;

        $.post("/admin/users/delete", { userId }, function (response) {
            if (response.deleted) {
                alert("User deleted successfully");
                location.reload();
            } else {
                alert("Failed to delete user.");
            }
        });
    });

    function toggleCondoField() {
        if ($("#roleSelect").val() === "owner") {
            $("#condoSelectGroup").show();
        } else {
            $("#condoSelectGroup").hide();
        }
    }

    // Trigger when role changes
    $("#roleSelect").change(toggleCondoField);

    // Run on page load
    toggleCondoField();
});
