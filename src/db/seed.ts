import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { runMigrations } from "./migrate";

dotenv.config({ path: ".env.local" });
dotenv.config();

export async function seedDatabase(customPool?: Pool) {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "postgres://localhost:5432/cinebook";

  const pool =
    customPool ||
    new Pool({
      connectionString,
      ssl:
        connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : undefined,
    });

  const client = await pool.connect();

  try {
    console.log("🌱 Seeding CineBook database with realistic cinema data...");

    // 1. Users (Admin and Standard Moviegoer)
    const adminPasswordHash = await bcrypt.hash("AdminPass123!", 10);
    const userPasswordHash = await bcrypt.hash("UserPass123!", 10);

    const adminUserRes = await client.query(
      `
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (
        gen_random_uuid(), 'Admin Director', 'admin@cinebook.com', $1, 'ADMIN', NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id;
      `,
      [adminPasswordHash]
    );
    const adminUserId = adminUserRes.rows[0].id;

    const standardUserRes = await client.query(
      `
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (
        gen_random_uuid(), 'Alex Mercer', 'user@cinebook.com', $1, 'USER', NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id;
      `,
      [userPasswordHash]
    );
    const standardUserId = standardUserRes.rows[0].id;

    console.log("👤 Created demo users: admin@cinebook.com and user@cinebook.com");

    // 2. Genres
    const genreNames = ["Sci-Fi", "Action", "Drama", "Thriller", "Adventure", "Crime", "Mystery"];
    const genreMap: Record<string, string> = {};

    for (const name of genreNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const res = await client.query(
        `
        INSERT INTO genres (id, name, slug, created_at)
        VALUES (gen_random_uuid(), $1, $2, NOW())
        ON CONFLICT (name) DO UPDATE SET name = $1
        RETURNING id;
        `,
        [name, slug]
      );
      genreMap[name] = res.rows[0].id;
    }

    // 3. Movies
    const sampleMovies = [
      {
        title: "Dune: Part Two",
        slug: "dune-part-two",
        description:
          "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future.",
        posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
        durationMins: 166,
        rating: "PG-13",
        releaseDate: "2024-03-01",
        language: "English",
        trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
        director: "Denis Villeneuve",
        cast: "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem",
        isFeatured: true,
        genres: ["Sci-Fi", "Adventure", "Action"],
      },
      {
        title: "Oppenheimer",
        slug: "oppenheimer",
        description:
          "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, exploring the moral and geopolitical aftermath of the Manhattan Project.",
        posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
        durationMins: 180,
        rating: "R",
        releaseDate: "2023-07-21",
        language: "English",
        trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
        director: "Christopher Nolan",
        cast: "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.",
        isFeatured: true,
        genres: ["Drama", "Thriller"],
      },
      {
        title: "Interstellar: 10th Anniversary IMAX",
        slug: "interstellar-imax",
        description:
          "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces catastrophic blight and environmental collapse.",
        posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
        durationMins: 169,
        rating: "PG-13",
        releaseDate: "2024-11-07",
        language: "English",
        trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
        director: "Christopher Nolan",
        cast: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
        isFeatured: true,
        genres: ["Sci-Fi", "Drama", "Adventure"],
      },
      {
        title: "Cyber Odyssey: 2099",
        slug: "cyber-odyssey-2099",
        description:
          "In a neon-drenched megacity controlled by synthetic intelligence, a rogue neural detective uncovers a conspiracy that threatens both organic and digital consciousness.",
        posterUrl: "https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
        durationMins: 135,
        rating: "R",
        releaseDate: "2025-01-15",
        language: "English",
        trailerUrl: "https://www.youtube.com/watch?v=dummy",
        director: "Karin Takahashi",
        cast: "Kenji Sato, Elena Rostova, Marcus Cole",
        isFeatured: false,
        genres: ["Sci-Fi", "Action", "Mystery"],
      },
      {
        title: "Neon Tokyo: Shadow Syndicate",
        slug: "neon-tokyo-shadow-syndicate",
        description:
          "Underground racing crews and corporate syndicates clash over quantum encryption hardware in high-octane night pursuits across subterranean Tokyo.",
        posterUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1600&auto=format&fit=crop&q=80",
        durationMins: 122,
        rating: "PG-13",
        releaseDate: "2025-02-20",
        language: "Japanese",
        trailerUrl: "https://www.youtube.com/watch?v=dummy",
        director: "Hideo Kojima",
        cast: "Takumi Minamino, Sakura Haruno, Jin Sakai",
        isFeatured: false,
        genres: ["Action", "Crime", "Thriller"],
      },
      {
        title: "The Dark Knight",
        slug: "the-dark-knight",
        description:
          "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        posterUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80",
        durationMins: 152,
        rating: "PG-13",
        releaseDate: "2008-07-18",
        language: "English",
        trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
        director: "Christopher Nolan",
        cast: "Christian Bale, Heath Ledger, Aaron Eckhart, Michael Caine",
        isFeatured: true,
        genres: ["Action", "Crime", "Drama"],
      },
    ];

    const movieIds: string[] = [];

    for (const mov of sampleMovies) {
      const res = await client.query(
        `
        INSERT INTO movies (
          id, title, slug, description, poster_url, backdrop_url, duration_mins,
          rating, release_date, language, trailer_url, director, "cast", is_featured,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          NOW(), NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          title = $1, description = $3, poster_url = $4, backdrop_url = $5,
          duration_mins = $6, rating = $7, language = $9, is_featured = $13
        RETURNING id;
        `,
        [
          mov.title,
          mov.slug,
          mov.description,
          mov.posterUrl,
          mov.backdropUrl,
          mov.durationMins,
          mov.rating,
          mov.releaseDate,
          mov.language,
          mov.trailerUrl,
          mov.director,
          mov.cast,
          mov.isFeatured,
        ]
      );
      const mId = res.rows[0].id;
      movieIds.push(mId);

      // Link genres
      for (const gName of mov.genres) {
        if (genreMap[gName]) {
          await client.query(
            `
            INSERT INTO movie_genres (id, movie_id, genre_id)
            VALUES (gen_random_uuid(), $1, $2)
            ON CONFLICT (movie_id, genre_id) DO NOTHING;
            `,
            [mId, genreMap[gName]]
          );
        }
      }
    }

    console.log(`🎬 Seeded ${sampleMovies.length} movies.`);

    // 4. Cinemas & Auditoriums
    const sampleCinemas = [
      {
        name: "CineBook Grand IMAX & Dolby Cinema",
        slug: "cinebook-grand-imax-ny",
        address: "700 Broadway, Manhattan",
        city: "New York",
        state: "NY",
        postalCode: "10003",
        phone: "+1 212-555-0199",
        imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
        screens: [
          { name: "Screen 1 - Grand IMAX Laser", sound: "IMAX 12-Channel Audio", totalSeats: 54 },
          { name: "Screen 2 - Dolby Cinema Prime", sound: "Dolby Atmos", totalSeats: 54 },
        ],
      },
      {
        name: "Starlight Luxury Cinema Lounge",
        slug: "starlight-luxury-lounge-la",
        address: "8500 Sunset Blvd, West Hollywood",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90069",
        phone: "+1 310-555-0144",
        imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
        screens: [
          { name: "Auditorium A - Recliner Suite", sound: "Dolby Atmos 7.1", totalSeats: 54 },
        ],
      },
      {
        name: "Lumina Boutique Cinema & Grill",
        slug: "lumina-boutique-chicago",
        address: "325 W Huron St, River North",
        city: "Chicago",
        state: "IL",
        postalCode: "60654",
        phone: "+1 312-555-0188",
        imageUrl: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&auto=format&fit=crop&q=80",
        screens: [
          { name: "Screen 1 - Velvet Dining Hall", sound: "DTS:X Surround", totalSeats: 54 },
        ],
      },
    ];

    const showtimeDataList = [];

    for (const cine of sampleCinemas) {
      const cineRes = await client.query(
        `
        INSERT INTO cinemas (id, name, slug, address, city, state, postal_code, phone, image_url, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET name = $1, address = $3
        RETURNING id;
        `,
        [cine.name, cine.slug, cine.address, cine.city, cine.state, cine.postalCode, cine.phone, cine.imageUrl]
      );
      const cinemaId = cineRes.rows[0].id;

      for (const scr of cine.screens) {
        const audRes = await client.query(
          `
          INSERT INTO auditoriums (id, cinema_id, name, total_seats, sound_system, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (cinema_id, name) DO UPDATE SET total_seats = $3
          RETURNING id;
          `,
          [cinemaId, scr.name, scr.totalSeats, scr.sound]
        );
        const auditoriumId = audRes.rows[0].id;

        // Create seats for this auditorium:
        // Rows A to F (6 rows) x 9 seats per row = 54 seats
        // Rows A-D: STANDARD
        // Rows E-F: VIP / RECLINER
        // Row F (seats 1 and 9): ACCESSIBLE
        const rows = ["A", "B", "C", "D", "E", "F"];
        const seatIds: { id: string; tier: string }[] = [];

        for (const r of rows) {
          for (let sNum = 1; sNum <= 9; sNum++) {
            let tier = "STANDARD";
            if (r === "E" || r === "F") {
              tier = "VIP";
            }
            if (r === "F" && (sNum === 1 || sNum === 9)) {
              tier = "ACCESSIBLE";
            }

            const seatRes = await client.query(
              `
              INSERT INTO seats (id, auditorium_id, row_letter, seat_number, seat_tier, created_at)
              VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
              ON CONFLICT (auditorium_id, row_letter, seat_number) DO UPDATE SET seat_tier = $4
              RETURNING id;
              `,
              [auditoriumId, r, sNum, tier]
            );
            seatIds.push({ id: seatRes.rows[0].id, tier });
          }
        }

        // Schedule Showtimes for each movie
        // Create 2 showtimes per movie for today and tomorrow
        const today = new Date();
        today.setMinutes(0, 0, 0);

        for (let mIdx = 0; mIdx < movieIds.length; mIdx++) {
          const movieId = movieIds[mIdx];
          const formats = ["IMAX", "2D", "3D"];
          const format = formats[mIdx % formats.length];
          const basePrice = format === "IMAX" ? 2200 : format === "3D" ? 1850 : 1500; // in minor units (cents)

          // Times today
          const start1 = new Date(today.getTime() + (mIdx * 3 + 2) * 3600 * 1000);
          const end1 = new Date(start1.getTime() + 2.5 * 3600 * 1000);

          // Tomorrow
          const start2 = new Date(today.getTime() + 24 * 3600 * 1000 + (mIdx * 3 + 1) * 3600 * 1000);
          const end2 = new Date(start2.getTime() + 2.5 * 3600 * 1000);

          for (const [sTime, eTime] of [
            [start1, end1],
            [start2, end2],
          ]) {
            const stRes = await client.query(
              `
              INSERT INTO showtimes (
                id, movie_id, auditorium_id, start_time, end_time, base_price_cents, format, created_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()
              ) RETURNING id;
              `,
              [movieId, auditoriumId, sTime, eTime, basePrice, format]
            );
            const showtimeId = stRes.rows[0].id;

            // Initialize showtime_seats for this showtime
            for (const seat of seatIds) {
              await client.query(
                `
                INSERT INTO showtime_seats (
                  id, showtime_id, seat_id, status, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, 'AVAILABLE', NOW(), NOW()
                )
                ON CONFLICT (showtime_id, seat_id) DO NOTHING;
                `,
                [showtimeId, seat.id]
              );
            }

            showtimeDataList.push(showtimeId);
          }
        }
      }
    }

    console.log(`🎟️ Seeded ${showtimeDataList.length} showtimes with initialized seat availability.`);
    console.log("✨ Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seed error:", err);
    throw err;
  } finally {
    client.release();
    if (!customPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
