$(document).ready(function() {
    const $form = $('.edit-condo-body form');

    // Form validation and AJAX submission
    $form.on('submit', function(e) {
        e.preventDefault(); // prevent default form submission

        const name = $form.find('input[name="name"]').val().trim();
        const address = $form.find('input[name="address"]').val().trim();
        const description = $form.find('textarea[name="description"]').val().trim();

        if (!name || !address || !description) {
            alert('Please fill in all required fields.');
            return;
        }

        if (!confirm('Are you sure you want to save changes?')) {
            return;
        }

        // Prepare FormData (no image customization now)
        const formData = new FormData(this);

        // AJAX POST
        $.ajax({
            url: $form.attr('action'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, address, description }),
            success: function(response) {
                window.location.href = `/condo/${response.condoId || ''}`;
            },
            error: function(xhr, status, error) {
                alert('Failed to update condo: ' + (xhr.responseText || error));
            }
        });
    });
});
