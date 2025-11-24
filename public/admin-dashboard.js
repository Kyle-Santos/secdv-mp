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
    $(".delete-btn").on("click", async function () {
        const userId = $(this).data("id");

        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const adminPwd = await promptAdminPassword();

            $.ajax({
                url: "/admin/users/delete",
                method: "POST",
                data: { userId, adminPassword: adminPwd },
                success: function(response) {
                    if (response.deleted) {
                        alert("User deleted successfully");
                        location.reload();
                    } else {
                        alert("Failed to delete user: " + response.message);
                    }
                },
                error: function(xhr) {
                    alert(xhr.responseJSON?.message || "Action failed.");
                }
            });
        } catch (err) {
            alert(err);
        }
    });



    $("#changePasswordForm").on("submit", async function(e) {
        e.preventDefault(); // Stop default form submission

        // Prompt admin for their password
        const adminPassword = await promptAdminPassword();

        // Collect form data
        const formData = {
            newPassword: $("input[name='newPassword']").val(),
            confirmPassword: $("input[name='confirmPassword']").val(),
            adminPassword: adminPassword
        };

        const userId = $(this).data("userid"); // store userId in form data attribute

        $.ajax({
            url: `/admin/users/${userId}/password`,
            type: "POST",
            data: formData,
            success: function(response) {
                alert("Password updated successfully!");
                window.location.href = "/admin/dashboard";
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.message || xhr.responseText || "Failed to update password.");
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

    // Change password
    $(".password-btn").on("click", function () {
        const userId = $(this).data("id");
        window.location.href = `/admin/users/${userId}/password`;
    });


    // Trigger when role changes
    $("#roleSelect").change(toggleCondoField);

    // Run on page load
    toggleCondoField();
});


async function promptAdminPassword() {
  const { value: password } = await Swal.fire({
    title: 'Confirm Admin Action',
    text: 'Enter your admin password to proceed',
    input: 'password',
    inputLabel: 'Password',
    inputPlaceholder: 'Enter password',
    inputAttributes: {
      maxlength: 128,
      autocapitalize: 'off',
      autocorrect: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    allowOutsideClick: false,
    preConfirm: (pwd) => {
      if (!pwd) {
        Swal.showValidationMessage('Password is required');
      }
      return pwd;
    }
  });

  if (!password) throw new Error('Password required or canceled');
  return password;
}
