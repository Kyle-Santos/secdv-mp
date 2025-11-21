function checkUser(){
    if($("#username-display").text() !== $(".profile-name").text().replace(/✔️/g, '')){
        $('#edit-profile-link').hide();
        $('.edit-delete-icons').hide();
    }
}

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
            function(data, status){
                if(status === 'success'){
                    console.log(data.deleted);
                    post.fadeOut();
                } else {
                    alert('error');
                }
            } 
        );
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