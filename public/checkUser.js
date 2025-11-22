// function checkUser(){
//     if($("#username-display").text() !== $(".profile-name").text().replace(/✔️/g, '')){
//         $('#edit-profile-link').hide();
//         $('.edit-delete-icons').hide();
//     }
// }

$(document).ready(function(){
    $('.review-delete').click(function(){
        var reviewId = this.value;
        var condoId = this.getAttribute('data-value');
        var post = $(this).closest('.grid-item');

        console.log(reviewId);
        console.log(condoId)

        
        $.post(
            'delete-review',
            {reviewId: reviewId, condoId: condoId},
        ).done(function(data) {
            if (data.deleted) {
                console.log('Review deleted:', data.msg);
                post.fadeOut(); // remove the post from the UI
            } else {
                alert('Failed to delete review: ' + (data.msg || 'Unknown error'));
            }
        })
        .fail(function(xhr, status, error) {
            console.error('Server error:', status, error);
            alert('Error deleting review. Please try again.');
        });
    });

    $('.comment-delete').click(function(){
        var commentId = this.value;
        var comment = $(this).closest('.comment');
        console.log(comment);
        
          $.post(
            'delete-comment',
            {commentId: commentId},
            function(data, status){
                if(status === 'success'){
                    console.log(data.deleted);
                    comment.fadeOut();
                } else {
                    alert('error');
                }
            } 
        );
    });
});