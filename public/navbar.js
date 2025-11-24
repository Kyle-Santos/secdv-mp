$(document).ready(function(){
    $.get(
        'loggedInStatus',
        function(data, status){
            if(status === 'success'){
                $("#login").hide();
                if(data.isAuthenticated){
                    $(".nav-logged-out").hide();
                    $(".nav-logged-in").show();
                    $("#username-display").text(data.username);
                    $("#profile-link").attr('href', 'profile/' + data.username);
                    $('#profile-link img').attr('src', data.picture);
                    showLogInView();
                    $("#login").hide();
                    updateDropdownText(data.username); // changes the dropdown

                    if(typeof checkUser === 'function'){
                        checkUser();
                    } else {
                        console.log('Not view profile page');
                    }
                }
                else{
                    $(".nav-logged-in").hide();
                    $("#logout-button").hide();

                    if(typeof checkUser === 'function'){
                        checkUser();
                    } else {
                        console.log('Not view profile page');
                    }
                }
            }
        }
    );

    $("#logout-button").click(function(){
        $.post(
           'logout',
            {},
            function(data, status){
                if(status === 'success') {
                    $(".nav-logged-in").hide();
                    $("#logout-button").hide();
                    window.location.href="/";
                }
                else{
                    alert('clicked');
                }
            }
        );
        
    });

    // Account creation form submission
    $("#create-account-form").submit(function(event) {
        // Prevent default form submission behavior
        event.preventDefault();
        
        // Validate the form inputs
        if (!checkCreateAccountForm()) {
            return;
        }

        var iconPath = $('input[name="avatar"]:checked').closest('.select-avatar').find('img.avatar').attr('src');

        // gather security answers – questions are sent by index so the server knows which were picked
        const questionBank = [
            // --- q1 block ---
            "What was the name of your first pet?",
            "In what city did you meet your first significant other?",
            "What is the last name of your childhood teacher?",
            "What was the name of the street your childhood friend lived on?",
            "What was the model of your first car?",
            "What was the name of your first stuffed animal or toy?",

            // --- q2 block ---
            "What was the name of the town where your grandparents lived?",
            "What is your oldest cousin's first name?",
            "What is the name of a place you've always wanted to visit?",
            "What is the name of the hospital where you were born?",
            "What was the first city you visited?",
            "What is the name of a restaurant you frequent?",

            // --- q3 block ---
            "What was the name of the first school you attended?",
            "What was the name of the first concert you attended?",
            "What is the name of the friend you've known the longest?",
            "What is the name of a place you celebrated a special occasion at?",
            "What was the name of your first roommate?",
            "What was the first dish you've successfully made?"
        ];
        const qIndex = [
            parseInt($('select[name="q1"]').val(), 10),
            6 + parseInt($('select[name="q2"]').val(), 10),   // offset by 6
            12 + parseInt($('select[name="q3"]').val(), 10)   // offset by 12
        ];
        const answers = [
            $('input[name="a1"]').val().trim(),
            $('input[name="a2"]').val().trim(),
            $('input[name="a3"]').val().trim()
        ];

        // Get form data
        const formData = {
            username: $("#create-account-form input[name='username']").val(),
            password: $("#create-account-form input[name='password']").val(),
            picture: iconPath,
            bio: $("#create-account-form textarea[name='description']").val(),
            questions: qIndex,   // array of 0-5
            answers:   answers   // parallel array of strings
        };

        $("#create-account").hide();

        // Send POST request to server
        $.post('/create-account', formData)
            .done(function(response) {
                // Handle success response
                alert(response.message); // Display success message
            })
            .fail(function(xhr, status, error) {
                // Handle failure response
                console.error('Error creating account:', error);
                alert(xhr.responseJSON.message); // Display error message
            });
    });

    // Login form submission
    $('#login-form').submit(function(event) {
        event.preventDefault(); // Prevent default form submission

        // Validate the form inputs
        if (!checkLoginForm()) {
            return;
        }

        const username = $("#login-form input[name='username']").val();
        const password = $("#login-form input[name='password']").val();
        const rememberMe = $("#login-form input[type='checkbox']").prop('checked'); // Get the state of the checkbox

        $("#login").hide();

        // Send login request to server
        $.post('/login', { username, password, rememberMe })
            .done(function(response) {
                // Successful login
                console.log(response.message);

                // Set the text of the <div> element to the entered username
                $("#username-display").text(username);
                $("#profile-link").attr('href', 'profile/' + username);
                $('#profile-link img').attr('src', response.picture);

                showLogInView();
                $("#login").hide();
                updateDropdownText(username); // changes the dropdown
                window.location.href="/";
                alert(response.message);
                // alert("Welcome to The Condo Bro, " + username);
            })
            .fail(function(xhr, status, error) {
                // Login failed
                console.error('Login failed:', error);
                alert(xhr.responseJSON.message);
            });
    });



    $("#create-account").hide();

    // Dropdown magic
    $(".right-nav .icon").hover(function(){
        $(this).toggleClass("highlighted");
    });

    $(".right-nav .icon").hover(function(){
        $(".nav-dropdown").toggle($(this).hasClass("highlighted"));
    });

    $("#show-login").click(function(){
        $("#login").slideDown();
        $(".nav-dropdown").hide(); // Hides dropdown after click
    });

    $("#close").click(function(){
        $("#login").hide();
    });
    

    $("#close-create").click(function(){
        $("#create-account").hide();
    });

    $("#show-create-account").click(function(){
        $("#create-account").show();
    });

    // Login button click event
    $("#login-button").click(function(){
        if ($(this).text() === "View Profile") {
            window.location.href = "/profile/" + $("#username-display").text();
        } else {
            $("#login").slideDown();
            $(".nav-dropdown").hide(); // Hides dropdown after clicks
        }
    });

    // Signup button click event
    $("#signup-button").click(function(){
        if ($(this).text() === "Edit Profile") {
            window.location.href = "/edit-profile";
        } else {
            $("#create-account").show();
            $(".nav-dropdown").hide(); // Hides dropdown after click
        }
    });

    $("#logout-button").click(function(){
        // window.location.href="index.html";
        location.reload();
        $(".nav-dropdown").hide(); // Hides dropdown after click
    });

    $("#view-condo").click(function(){
        // Check if the current page is in index page
        if (window.location.pathname === "/") {
            // Smooth scrolling behavior
            window.scrollBy({
                top: 650,
                left: 0,
                behavior: 'smooth'
            });
        } else {
            // Redirect to index page
            window.location.href = "/";       
        }
    });
    
    // Forgot password functionality - Two step process
    $("#show-forgot-password-from-login").click(function(event){
        event.preventDefault();
        $("#login").hide();
        $("#forgot-password").show();
        // Reset to stage 1
        $("#username-stage").show();
        $("#questions-stage").hide();
        $("#forgot-password-form")[0].reset();
        $("#security-questions-container").empty();
    });

    $("#close-forgot").click(function(){
        $("#forgot-password").hide();
        $("#login").show();
        // Reset to stage 1
        $("#username-stage").show();
        $("#questions-stage").hide();
        $("#forgot-password-form")[0].reset();
        $("#security-questions-container").empty();
    });

    // Continue button handler - load security questions
    $("#continue-to-questions").click(function(){
        const username = $("#forgot-username").val().trim();
        
        if (!username) {
            alert("Please enter your username");
            return;
        }

        // Show loading state
        $(this).prop('disabled', true).text('Loading...');

        // Load security questions for this user
        $.get('/get-security-questions', { username: username })
            .done(function(response) {
                if (response.success) {
                    loadSecurityQuestions(response.questions);
                    // Move to stage 2
                    $("#username-stage").hide();
                    $("#questions-stage").show();
                } else {
                    alert(response.message);
                }
            })
            .fail(function(xhr, status, error) {
                console.error('Error loading security questions:', error);
                alert('Error loading security questions. Please try again.');
            })
            .always(function() {
                // Reset button state
                $("#continue-to-questions").prop('disabled', false).text('Continue');
            });
    });

    // Function to load security questions
    function loadSecurityQuestions(questions) {
        const container = $("#security-questions-container");
        container.empty();
        
        questions.forEach((question, index) => {
            const questionHtml = `
                <div style="margin-bottom: 15px;">
                    <div style="margin-bottom: 5px;"><strong>${question}</strong></div>
                    <input type="text" name="a${index + 1}" placeholder="Your answer" required style="width: 100%; padding: 8px;">
                </div>
            `;
            container.append(questionHtml);
        });
    }

    // Forgot password form submission
    $("#forgot-password-form").submit(function(event) {
        event.preventDefault();
        
        if (!checkForgotPasswordForm()) {
            return;
        }

        const username = $("#forgot-username").val();
        const newPassword = $("#forgot-password-form input[name='new-password']").val();
        const confirmNewPassword = $("#forgot-password-form input[name='confirm-new-password']").val();

        // Gather security answers
        const answers = [
            $("#forgot-password-form input[name='a1']").val().trim(),
            $("#forgot-password-form input[name='a2']").val().trim(),
            $("#forgot-password-form input[name='a3']").val().trim()
        ];

        $("#forgot-password").hide();

        // Send POST request to server
        $.post('/forgot-password', {
            username: username,
            newPassword: newPassword,
            confirmNewPassword: confirmNewPassword,
            answers: answers
        })
        .done(function(response) {
            alert(response.message);
            $("#forgot-password").hide();
            $("#login").show();
            // Reset the form completely
            resetForgotPasswordForm();
        })
        .fail(function(xhr, status, error) {
            console.error('Error resetting password:', error);
            alert(xhr.responseJSON.message);
            $("#forgot-password").show();
        });
    });

    // Update the form validation function
    function checkForgotPasswordForm(){
        const username = $("#forgot-username").val();
        const newPassword = $("#forgot-password-form input[name='new-password']").val();
        const confirmNewPassword = $("#forgot-password-form input[name='confirm-new-password']").val();

        if(!username || username.length < 1){
            alert("Username is required.");
            return false;
        }

        if(newPassword.length < 1 || confirmNewPassword.length < 1){
            alert("Password fields must not be empty.");
            return false;
        }

        if(checkWhiteSpace(newPassword) || checkWhiteSpace(confirmNewPassword)){
            alert("Password must not contain white space.");
            return false;
        }

        if(newPassword !== confirmNewPassword){
            alert("Passwords do not match. Please try again.");
            return false;
        }

        // Check if security questions are answered
        const answer1 = $("#forgot-password-form input[name='a1']").val();
        const answer2 = $("#forgot-password-form input[name='a2']").val();
        const answer3 = $("#forgot-password-form input[name='a3']").val();
        
        if(!answer1 || !answer2 || !answer3 || 
        answer1.length < 1 || answer2.length < 1 || answer3.length < 1){
            alert("Please answer all security questions.");
            return false;
        }

        return true;
    }

    // Helper function to reset the forgot password form
    function resetForgotPasswordForm() {
        $("#forgot-password-form")[0].reset();
        $("#security-questions-container").empty();
        $("#username-stage").show();
        $("#questions-stage").hide();
    }
});

function updateDropdownText(username) { 
    $("#login-button").text(username !== '' ? "View Profile" : 'Login'); // Change login to username if not empty, otherwise revert to Login
    $("#signup-button").text(username !== '' ? 'Edit Profile' : 'Signup'); // Change signup to View Profile if username is not empty, otherwise revert to Signup
    $("#logout-button").text(username !== '' ? 'Log Out' : 'Log Out');
    $("#logout-button").show();
}


function showLogInView(){
    $(".nav-logged-out").hide();
    $(".nav-logged-in").show();
}

function checkWhiteSpace(text){
    if(text.indexOf(' ') !== -1){
        return true;
    }

    return false;
}

function checkLoginForm(){
    let username = document.forms["login-form"]["username"].value;
    let password = document.forms["login-form"]["password"].value;

    if(username.length < 1 || password.length < 1){
        alert("Login fields must not be empty.");
        return false;
    }

    if(checkWhiteSpace(username) || checkWhiteSpace(password)){
        alert("Username and password must not contain white space.");
        return false;
    }
    
    return true;

}

function checkCreateAccountForm(){
    let username = document.forms["create-account-form"]["username"].value;
    let password = document.forms["create-account-form"]["password"].value;
    let confirmPassword = document.forms["create-account-form"]["confirm-password"].value;

    if(username.length < 1 || password.length < 1 || confirmPassword.length < 1){
        alert("Required fields must not be empty.");
        return false;
    }

    if(checkWhiteSpace(username) || checkWhiteSpace(password) || checkWhiteSpace(confirmPassword)){
        alert("Username and password must not contain white space.");
        return false;
    }

    if(password !== confirmPassword){
        alert("Passwords do not match. Please try again.");
        return false;
    }

    return true;
}
