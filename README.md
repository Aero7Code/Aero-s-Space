<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lexy Love</title>
    <link rel="stylesheet" href="StyleSheet.css">
</head>
<body>
    <header>
        <h1>Welcome to Aero's Space</h1>
        <p>Contact: <a href="mailto:lexyloveonme+AeroSpace@gmail.com">Here reach me</a></p>
    </header>

    <main>
        <section id="about">
            <h2>Aero7</h2>
            <p>Welcome to my personal Space! Here, you can learn more about me and what I do.</p>
        </section>

        <section id="contact">
            <h2>Contact Me</h2>
            <form id="contact-form">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required>

                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>

                <label for="message">Message:</label>
                <textarea id="message" name="message" required></textarea>

                <button type="submit">Send Message</button>
            </form>
            <p id="response"></p>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 Aero7Code . All rights reserved.</p>
    </footer>

    <script src="Script.js"></script>
</body>
</html>
