-- =====================================================================
-- Seed real, verified problems for the "cybersecurity" topic — the last
-- category still at 0 questions after the previous 16-topic batch.
-- Expected outputs verified via a standalone reference-solver script
-- before transcription, same methodology as the prior seed migrations.
-- =====================================================================

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Caesar Cipher Decryption',
  'cyber-caesar-decrypt',
  'Given a shift value and a Caesar-ciphered message, decrypt it back to plaintext. Letters wrap around the alphabet; case is preserved and non-letter characters (spaces, punctuation) pass through unchanged.',
  'easy',
  (select id from challenge_categories where slug = 'cybersecurity'),
  15, 20,
  array['cybersecurity', 'cryptography'],
  '0 <= shift <= 25, message length <= 1000',
  'Line 1: the shift value. Line 2: the ciphered message.',
  'The decrypted plaintext message.',
  $sc${"javascript":"const [l1, l2] = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst shift = Number(l1.trim());\nconst text = l2;\n// TODO: shift each letter back by `shift` positions, wrapping within its case, leave non-letters unchanged\nconsole.log(text);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nshift = int(lines[0].strip())\ntext = lines[1]\n# TODO: shift each letter back by `shift` positions, wrapping within its case, leave non-letters unchanged\nprint(text)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Password Strength Score',
  'cyber-password-strength',
  'Score a password from 0-4 by counting how many of these rules it satisfies: (1) at least 8 characters, (2) contains an uppercase letter, (3) contains a digit, (4) contains a special (non-alphanumeric) character.',
  'easy',
  (select id from challenge_categories where slug = 'cybersecurity'),
  10, 20,
  array['cybersecurity', 'authentication'],
  '1 <= password length <= 200',
  'A single line: the password.',
  'A single integer: the strength score (0-4).',
  $sc${"javascript":"const pw = require('fs').readFileSync(0, 'utf8').replace(/\\n$/, '');\n// TODO: check length>=8, has uppercase, has digit, has special char; count how many pass\nconsole.log(0);\n","python":"pw = __import__('sys').stdin.read().rstrip('\\n')\n# TODO: check length>=8, has uppercase, has digit, has special char; count how many pass\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Brute-Force Lockout Detection',
  'cyber-brute-force-lockout',
  'Given a max-attempts threshold, a sliding time window (seconds), and a list of login-attempt timestamps (ascending), find the 1-indexed attempt number at which the account first gets locked out (i.e. the count of attempts within the trailing window reaches the threshold). Output -1 if it never locks out.',
  'medium',
  (select id from challenge_categories where slug = 'cybersecurity'),
  20, 50,
  array['cybersecurity', 'rate-limiting'],
  '1 <= maxAttempts <= 10000, 1 <= number of attempts <= 10000',
  'Line 1: maxAttempts windowSeconds. Line 2: space-separated ascending attempt timestamps.',
  'A single integer: the 1-indexed lockout attempt, or -1.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconst [maxAttempts, windowSec] = lines[0].trim().split(' ').map(Number);\nconst timestamps = lines[1].trim().split(' ').map(Number);\n// TODO: for each attempt, count attempts within (t - windowSec, t]; report the first index reaching maxAttempts\nconsole.log(-1);\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden from challenges c cross join (values
  ($i$3
Khoor Zruog$i$, $o$Hello World$o$, false),
  ($i$5
Mjqqt$i$, $o$Hello$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'cyber-caesar-decrypt' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden from challenges c cross join (values
  ($i$Password1!$i$, $o$4$o$, false),
  ($i$password$i$, $o$1$o$, true),
  ($i$PASS1234$i$, $o$3$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'cyber-password-strength' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden from challenges c cross join (values
  ($i$3 60
0 10 20 30$i$, $o$3$o$, false),
  ($i$3 30
0 100 200$i$, $o$-1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'cyber-brute-force-lockout' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);
