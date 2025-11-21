$(document).ready(function(){
    // likes and dislikes
    $(".fa").on("click", async function() {
        // Store a reference to $(this) in a variable
        var $form = $(this);

        $.get('/loggedInStatus', async function(data) {
            if(!data.isAuthenticated) {
                alert("You must be logged in to like a review.");
                return;
            } 

            var likeClass = $form.attr("class");
            var reviewId = $form.closest('.grid-item').attr('id');
            var $totalLikes = $form.closest('.react-post').find('.total-likes');

            $form.toggleClass("clicked");

            // is like or unlike
            const isClicked = likeClass.includes("clicked");

            // is like or dislike
            const isLike = likeClass.includes("fa-thumbs-up");

            if (isLike) {
                var $otherLike = $form.closest('.react-post').find(".fa-thumbs-down");
                if ($otherLike.hasClass("clicked")) {
                    await submitLike(reviewId, true, false);
                    $otherLike.toggleClass("clicked");
                }   
            } else {
                var $otherLike = $form.closest('.react-post').find(".fa-thumbs-up");
                if ($otherLike.hasClass("clicked")) {
                    await submitLike(reviewId, true, true);
                    $otherLike.toggleClass("clicked");
                }  
            }

            $.post(
                'like',
                {reviewId: reviewId, isClicked: isClicked, isLike: isLike},
                function(data, status){
                    if(status === 'success'){
                        $totalLikes.text(data.totalLikes + " people liked");
                    }
                    else{
                        alert('error');
                    }
                }
            );

        });
    });
});

async function submitLike(reviewId, isClicked, isLike) {
    await $.post(
        'like',
        {reviewId: reviewId, isClicked: isClicked, isLike: isLike},
        function(data, status){
            if(status !== 'success'){
                alert('error');
            }
        }
    );
}