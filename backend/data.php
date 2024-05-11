<?php


if (isset($_POST['login'])) {
    logUser();
}
elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    getApiKey();
}

function logUser()
{
    $token = uniqid();
    setcookie('auth_token', $token, time() + (86400 * 30), '/');

    $file = fopen('authtoken.txt', 'w');
    fwrite($file, $token);
    fclose($file);
}

function getApiKey()
{
    // Get the given authorization token.
    $authorization = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);

    if ($authorization != file_get_contents('authtoken.txt', true)) {
        echo 'Error: 403 unauthorized.';
    }
    else {
        echo file_get_contents('apikey.txt', true);
    }
}

?>
