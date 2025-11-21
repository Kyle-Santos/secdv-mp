var ratingButtons;
$(document).ready(function(){


    // create review form
    $("#search-review").submit(function(event){
        event.preventDefault();
        var text = $("#search-review-input").val().toUpperCase();
        var condoId = window.location.pathname.split('/condo/')[1];

        
        $.post(
            'search-review',
            {text: text, condoId: condoId},
            function(data, status){
                if(status === 'success'){
                    $(".reviews-container").empty();

                    data.reviews.forEach(function(review){
                        // Create a new review element
                        var $review = $('<div>').attr('id', review._id).addClass('grid-item');

                        // Create review header
                        var $reviewHeader = $('<div>').addClass('review-header');
                        var $reviewHeaderLeft = $('<div>').addClass('review-header-left');
                        $reviewHeaderLeft.append($('<h3>').text(review.title));
                        $reviewHeaderLeft.append('Posted on ' + review.date);
                        $reviewHeader.append($reviewHeaderLeft);

                        // Create star rating
                        var $reviewHeaderRight= $('<div>');
                        var $starRating = $('<div>').addClass('star-rating').attr('id', 'rating');
                        review.rating.forEach(function(rating) {
                            var $star = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="presentation"> <path d="M12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72 3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18-1.1 4.72c-.2.86.73 1.54 1.49 1.08l4.15-2.5z"></path></svg>');
                            if (rating) {
                                $star.addClass('star-on');
                            } else {
                                $star.addClass('star-off');
                            }
                            $starRating.append($star);
                        });
                        $reviewHeaderRight.append($starRating);
                        $reviewHeader.append($reviewHeaderRight);
                        $review.append($reviewHeader);

                        // Create review body
                        var $reviewBody = $('<div>').addClass('review-body');
                        $reviewBody.append($('<p>').text(review.content));
                        $review.append($reviewBody);

                        // Create review picture (if image exists)
                        if (review.image) {
                            var $reviewPicture = $('<div>').addClass('review-picture');
                            $reviewPicture.append($('<img>').attr('src', review.image));
                            $review.append($reviewPicture);
                        }

                        // Create review footer
                        var $reviewFooter = $('<div>').addClass('review-footer');
                        var $reviewProfile = $('<div>').addClass('review-profile');
                        $reviewProfile.append($('<a>').attr('href', '/profile/' + review.author.user).append($('<img>').attr('src', review.author.picture)));
                        $reviewProfile.append($('<div>').append($('<a>').attr('href', '/profile/' + review.author.user).append($('<b>').text(review.author.user))).append('<br/>' + review.author.job));
                        $reviewFooter.append($reviewProfile);
                        var $reactPost = $('<div>').addClass('react-post');
                        $reactPost.append($('<div>').addClass('icon-like').append('<button type="button" class="fa fa-thumbs-up"></button><button type="button" class="fa fa-thumbs-down"></button>'));
                        $reactPost.append(review.totalLikes + ' people liked');
                        $reviewFooter.append($reactPost);
                        $review.append($reviewFooter);

                        // Create comments section
                        $review.append($('<div><hr/><h4>Comments:</h4></div>'));
                        var $commentForm = $('<form>').addClass('create-comment-form').attr('method', 'post');
                        var $commentContainer = $('<div>').addClass('comment-container');
                        $commentContainer.append($('<textarea>').addClass('comment-textarea').attr('placeholder', 'Write your comment here...'));
                        $commentContainer.append($('<button>').addClass('comment-button').text('Comment'));
                        $commentForm.append($commentContainer);
                        $review.append($commentForm);
                        var $comments = $('<div>').addClass('comments');
                        review.comments.forEach(function(comment) {
                            var $comment = $('<div>').addClass('comment');
                            var $commentDiv = $('<div>');
                            $commentDiv.append($('<a>').attr('href', '/profile/' + comment.user.user).append($('<img>').attr('src', comment.user.picture)));
                            var $commentRight = $('<div>').addClass('comment-right');
                            var $commentHeader = $('<div>');
                            $commentHeader.append($('<a>').attr('href', '/profile/' + comment.user.user).append($('<b>').text(comment.user.user)));
                            if (comment.user.job === 'Owner') {
                                $commentHeader.append($('<span>').addClass('verified-checkmark').text('✔️'));
                            }
                            $commentHeader.append(comment.date);
                            $commentRight.append($commentHeader);
                            $commentRight.append($('<div>').append($('<p>').text(comment.content)));
                            $comment.append($commentDiv, $commentRight);
                            $comments.append($comment);
                        });
                        $review.append($comments);

                        // Append the constructed review element to the reviews-container
                        $('.reviews-container').append($review);
                     });
                }
                else{
                    alert('error');
                }
            }
        );


    })

    $("#create-review-form").submit(function(event) { 
        // Prevent default form submission behavior
        event.preventDefault();

        // Get form data
        var title = $("#review-title").val().trim();
        var content = $("#review-content").val().trim();
        var rating = getRating();

        // Validate the form inputs
        if (!title || !content || rating === 0) {
            alert("Please fill in the title, content, and select a star rating.");
            return; // Exit the function if validation fails
        }

        // Get uploaded image if available
        var image = $("#add-image").prop('files')[0];
        var imagePath;

        // Get the current URL path
        const condoId = window.location.pathname.split('/condo/')[1];

        var date = new Date().toLocaleDateString();

        // send image to the server
        if (image) {
            var formData = new FormData();
            formData.append('image', image);

            $.ajax({
                url: '/upload-image',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    console.log(response);
                    imagePath = `images/client-uploaded-files/${image.name}`;

                    // Continue with review submission
                    submitReview(title, content, rating, imagePath, date, condoId);
                },
                error: function(xhr, status, error) {
                    // Handle failure response
                    console.error('Error uploading image:', error);
                    alert(xhr.responseJSON.message); // Display error message
                }
            });
        } else {
            // Continue with review submission without image
            submitReview(title, content, rating, imagePath, date, condoId);
        }
    });


    // create comment form
    $(".create-comment-form").submit(function(event) { 
        // Prevent default form submission behavior
        event.preventDefault();

        // Store a reference to $(this) in a variable
        var $form = $(this);

        $.get('/loggedInStatus', function(data) {
            if(!data.isAuthenticated) {
                alert("You must be logged in to create a comment.");
                return;
            } 

            // Get form data
            var reviewId = $form.closest('.grid-item').attr('id');
            var content = $("#" + reviewId + " .comment-textarea").val();
            var date = new Date().toLocaleDateString();
            
            // Validate the form inputs
            if (!content) {
                alert("Please put a comment first.");
                return; // Exit the function if validation fails
            }

            // Get form data
            const formData = {
                content: content,
                date: date,
                reviewId: reviewId,
            };

            // Send POST request to server
            $.post('/create-comment', formData)
                .done(function(response) {
                    // Handle success response
                    alert(response.message); // Display success message
                    $(".comment-textarea").val("");
                    
                    // Create a new review element
                    var reviewElement = document.createElement("div");
                    reviewElement.classList.add("comment");

                    // Construct HTML content for the new review
                    reviewElement.innerHTML = `
                    <div>
                        <a href="/profile/${response.user.username}"><img src="${response.user.picture}"/></a>
                    </div>
                    <div class="comment-right">
                        <div>
                            <a href="/profile/${response.user.username}"><b>${response.user.username}</b></a> 
                            <span class="verified-checkmark">${response.user.job === 'Owner' ? '✔️' : ''}</span>
                            ${date}
                        </div>
                        <div>
                            <p>${content}</p>
                        </div>
                    </div>
                    `;

                    // Prepend the new review to the reviews container
                    $("#" + reviewId + " .comments").prepend(reviewElement);
                })
                .fail(function(xhr, status, error) {
                    // Handle failure response
                    console.error('Error creating account:', error);
                    alert(xhr.responseJSON.message); // Display error message
                });
        });
    });


$("#create-review").hide();

$("#close-create-review").click(function(){
    $("#create-review").hide();
})

$("#show-create-review").click(function() {
    $.get('/loggedInStatus', function(data) {
            if(data.isAuthenticated) { 
                $("#create-review").show();
            } else {
                alert("You must be logged in to create a review.");
            }
    });
});

// 
$('.star-rating-button').on('mouseenter', selectStars);

$('.star-rating-button').on('mouseleave', resetStars);

$('.star-rating-button').on('click', function() {
    const ratingValue = $(this).data('rating');
    highlightStars(ratingValue);

    // Remove the mouseenter and mouseleave event listeners from all buttons
    $('.star-rating-button').off('mouseenter mouseleave');
});

function selectStars() {
    const ratingValue = $(this).data('rating');
    highlightStars(ratingValue);
}

function highlightStars(rating) {
    $('.star-rating-button').each(function() {
        const buttonRating = $(this).data('rating');
        if (buttonRating <= rating) {
            $(this).addClass('active');
        } else {
            $(this).removeClass('active');
        }
    });
}

function resetStars() {
    $('.star-rating-button').removeClass('active');
}
    });

function getRating() {
    let maxRating = 0;
    $('.star-rating-button').each(function() {
        if ($(this).hasClass('active')) {
            const buttonRating = parseInt($(this).data('rating'));
            maxRating = Math.max(maxRating, buttonRating);
        }
    });
    return maxRating;
}

function submitReview(title, content, rating, imagePath, date, condoId) {
    const formData = {
        condoId: condoId,
        title: title,
        content: content,
        rating: rating,
        image: imagePath,
        date: date,
    };

    // Send PATCH request to server
    $.ajax({
        url: '/create-review',
        type: 'PATCH',
        data: formData,
        success: function(response) {
            $("#create-review").hide();
            // Handle success response
            alert(response.message); // Display success message
            window.location.reload();
        },
        error: function(xhr, status, error) {
            // Handle failure response
            console.error('Error publishing review:', error);
            alert(xhr.responseJSON.message); // Display error message
        }
    });
}