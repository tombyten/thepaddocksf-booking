import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const { rows } = await sql`
    INSERT INTO users (email, name, password_hash, role)
    VALUES (${email.toLowerCase()}, ${name}, ${hash}, 'admin')
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = 'admin',
          name = EXCLUDED.name
    RETURNING id, email, role
  `;

  console.log("Admin user upserted:", rows[0]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
