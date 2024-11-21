const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
const port = 3000;

// Middleware za parsiranje JSON podataka
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Povezivanje na MySQL bazu
const connection = mysql.createConnection({
    host: "localhost",        // Postavi stvarne podatke
    user: "dstojcevic",       // Korisničko ime baze
    password: "11",           // Lozinka baze
    database: "database"      // Ime baze
});

connection.connect(function (err) {
    if (err) throw err;
    console.log("Connected to database!");
});

// === ROUTES ===

// Ruta za dohvaćanje svih knjiga
app.get("/api/knjige", (req, res) => {
    connection.query("SELECT * FROM knjiga", (error, results) => {
        if (error) {
            console.error("Error fetching books:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(results);
        }
    });
});

// Ruta za rezervaciju knjige
app.post("/api/rezerv_knjige", (req, res) => {
    const data = req.body;
    const today = new Date().toISOString().split('T')[0]; // Trenutni datum
    const rezervacija = [today, data.id_knjiga, data.id_korisnik];

    connection.query(
        "INSERT INTO rezervacija (datum, knjiga, korisnik) VALUES (?, ?, ?)",
        rezervacija,
        (error, results) => {
            if (error) {
                console.error("Error creating reservation:", error.message);
                res.status(500).send("Internal Server Error");
            } else {
                res.json({ message: "Reservation created!", id: results.insertId });
            }
        }
    );
});

// Ruta za dohvaćanje slobodnih knjiga
app.get("/api/slob_knjige", (req, res) => {
    const query = `
    SELECT 
      knjiga.id, knjiga.naslov, knjiga.autor, 
      knjiga.stanje - COUNT(rezervacija.knjiga) AS slobodne 
    FROM knjiga 
    LEFT JOIN rezervacija ON knjiga.id = rezervacija.knjiga 
    GROUP BY knjiga.id;
  `;
    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching available books:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(results);
        }
    });
});

// Ruta za provjeru je li knjiga slobodna
app.get("/api/slob_knjige/:id_knjige", (req, res) => {
    const { id_knjige } = req.params;

    const query = `
    SELECT knjiga.id, knjiga.naslov, 
      knjiga.stanje - COUNT(rezervacija.knjiga) AS slobodne 
    FROM knjiga 
    LEFT JOIN rezervacija ON knjiga.id = rezervacija.knjiga 
    WHERE knjiga.id = ? 
    GROUP BY knjiga.id;
  `;

    connection.query(query, [id_knjige], (error, results) => {
        if (error) {
            console.error("Error checking book availability:", error.message);
            res.status(500).send("Internal Server Error");
        } else if (results.length === 0) {
            res.status(404).send({ message: "Book not found" });
        } else {
            res.json(results[0]);
        }
    });
});

// Ruta za dohvaćanje rezervacija s korisnicima
app.get("/api/rezerv_knjige_korisnici", (req, res) => {
    const query = `
    SELECT knjiga.naslov, korisnik.ime, korisnik.prezime, rezervacija.datum 
    FROM rezervacija 
    JOIN knjiga ON knjiga.id = rezervacija.knjiga 
    JOIN korisnik ON korisnik.id = rezervacija.korisnik;
  `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching reservations with users:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(results);
        }
    });
});

// Ruta za dohvaćanje rezervacija za određenu knjigu
app.get("/api/rezerv_knjige/:id_knjiga", (req, res) => {
    const { id_knjiga } = req.params;

    const query = `
    SELECT korisnik.ime, korisnik.prezime, rezervacija.datum 
    FROM rezervacija 
    JOIN korisnik ON korisnik.id = rezervacija.korisnik 
    WHERE rezervacija.knjiga = ?;
  `;

    connection.query(query, [id_knjiga], (error, results) => {
        if (error) {
            console.error("Error fetching reservations for book:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(results);
        }
    });
});

// Ruta za dohvaćanje svih korisnika
app.get("/api/korisnici", (req, res) => {
    const query = "SELECT * FROM korisnik";

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching users:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(results);
        }
    });
});

// Ruta za dohvaćanje korisnika po ID-u
app.get("/api/korisnici/:id_korisnik", (req, res) => {
    const { id_korisnik } = req.params;

    const query = "SELECT * FROM korisnik WHERE id = ?";

    connection.query(query, [id_korisnik], (error, results) => {
        if (error) {
            console.error("Error fetching user:", error.message);
            res.status(500).send("Internal Server Error");
        } else if (results.length === 0) {
            res.status(404).send({ message: "User not found" });
        } else {
            res.json(results[0]);
        }
    });
});

// Ruta za ažuriranje korisnika
app.put("/api/korisnici/:id_korisnik", (req, res) => {
    const { id_korisnik } = req.params;
    const data = req.body;

    const query = `
    UPDATE korisnik 
    SET ime = ?, prezime = ?, email = ? 
    WHERE id = ?;
  `;

    connection.query(query, [data.ime, data.prezime, data.email, id_korisnik], (error, results) => {
        if (error) {
            console.error("Error updating user:", error.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.json({ message: "User updated successfully!" });
        }
    });
});

// === ERROR HANDLING ===

// Middleware za hvatanje grešaka
app.use((err, req, res, next) => {
    console.error(err.stack); // Ispis greške u konzolu
    res.status(500).send({ error: "Something went wrong!" }); // Vraća generičku poruku klijentu
});

// === SERVER ===
app.listen(port, () => {
    console.log("Server running at port: " + port);
});
