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

        // Get form data
        const formData = {
            username: $("#create-account-form input[name='username']").val(),
            password: $("#create-account-form input[name='password']").val(),
            picture: iconPath,
            bio: $("#create-account-form textarea[name='description']").val(),
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