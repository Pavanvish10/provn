-- =====================================================================
-- Seed real, verified coding challenges + hidden test cases.
-- Every reference solution and expected_output below was independently
-- verified offline (Node.js for the algorithmic problems, node:sqlite for
-- the SQL problems) before being written here — see the integration
-- report for the verification approach. Safe to re-run: challenges use
-- ON CONFLICT (slug) DO NOTHING, and test cases are only inserted the
-- first time a challenge has zero test cases yet.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Two Sum
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Two Sum$t$,
  'two-sum',
  $desc$Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.

You may assume that each input has exactly one solution, and you may not use the same element twice.$desc$,
  'easy',
  (select id from challenge_categories where slug = 'arrays'),
  15,
  15,
  ARRAY['arrays','hash-map','easy'],
  $cons$2 <= nums.length <= 1000. Exactly one valid pair is guaranteed to exist.$cons$,
  $inf$Line 1: comma-separated integers (the array). Line 2: an integer (the target).$inf$,
  $outf$The two 0-indexed indices i,j (with i < j) such that nums[i] + nums[j] = target, printed comma-separated with no spaces, e.g. `0,1`.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst nums = lines[0].split(',').map(Number);\nconst target = Number(lines[1]);\n\n// TODO: find the two indices that sum to target\n// console.log(i + ',' + j);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nnums = [int(x) for x in lines[0].split(',')]\ntarget = int(lines[1])\n\n# TODO: find the two indices that sum to target\n# print(str(i) + ',' + str(j))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$2,7,11,15
9$tci$, $tco$0,1$tco$, false),
  ($tci$3,2,4
6$tci$, $tco$1,2$tco$, true),
  ($tci$3,3
6$tci$, $tco$0,1$tco$, true),
  ($tci$1,5,3,9
12$tci$, $tco$2,3$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'two-sum'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Valid Parentheses
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Valid Parentheses$t$,
  'valid-parentheses',
  $desc$Given a string containing only the characters `(`, `)`, `[`, `]`, `{`, `}`, determine if the input string is valid.

An input string is valid if brackets are closed by the same type of bracket, and brackets are closed in the correct order.$desc$,
  'easy',
  (select id from challenge_categories where slug = 'data-structures'),
  10,
  10,
  ARRAY['stack','strings','easy'],
  $cons$0 <= s.length <= 10000. s consists only of bracket characters.$cons$,
  $inf$A single line containing only the characters ( ) [ ] { }.$inf$,
  $outf$Print `true` or `false` (lowercase).$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst s = lines[0];\n\n// TODO: use a stack to check the brackets are balanced\n// console.log(true);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ns = lines[0]\n\n# TODO: use a stack to check the brackets are balanced\n# print('true')\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$()$tci$, $tco$true$tco$, false),
  ($tci$()[]{}$tci$, $tco$true$tco$, true),
  ($tci$(]$tci$, $tco$false$tco$, true),
  ($tci$([)]$tci$, $tco$false$tco$, true),
  ($tci${[]}$tci$, $tco$true$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'valid-parentheses'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Reverse Linked List
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Reverse Linked List$t$,
  'reverse-linked-list',
  $desc$A singly linked list is given as its node values in order, head to tail. Reverse the linked list and return the values in the new order.

(We represent the list as a comma-separated array of values for this exercise — the algorithmic reversal logic is what's being tested.)$desc$,
  'easy',
  (select id from challenge_categories where slug = 'linked-lists'),
  10,
  10,
  ARRAY['linked-list','easy'],
  $cons$0 <= list length <= 5000.$cons$,
  $inf$Comma-separated integers representing the linked list values in order (head to tail).$inf$,
  $outf$Comma-separated integers — the reversed list.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst values = lines[0].split(',').map(Number);\n\n// TODO: reverse the list\n// console.log(reversed.join(','));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nvalues = [int(x) for x in lines[0].split(',')]\n\n# TODO: reverse the list\n# print(','.join(str(x) for x in reversed_values))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$1,2,3,4,5$tci$, $tco$5,4,3,2,1$tco$, false),
  ($tci$1,2$tci$, $tco$2,1$tco$, true),
  ($tci$7$tci$, $tco$7$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'reverse-linked-list'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Valid Palindrome
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Valid Palindrome$t$,
  'valid-palindrome',
  $desc$Given a string `s`, return true if it is a palindrome after converting all uppercase letters to lowercase and removing all non-alphanumeric characters.$desc$,
  'easy',
  (select id from challenge_categories where slug = 'strings'),
  10,
  10,
  ARRAY['strings','two-pointers','easy'],
  $cons$0 <= s.length <= 10000.$cons$,
  $inf$A single line string s (may include mixed case, spaces, and punctuation).$inf$,
  $outf$Print `true` or `false` — whether s is a palindrome once non-alphanumeric characters are removed and case is ignored.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst s = lines[0];\n\n// TODO: strip non-alphanumeric chars, lowercase, check palindrome\n// console.log(true);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ns = lines[0]\n\n# TODO: strip non-alphanumeric chars, lowercase, check palindrome\n# print('true')\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$A man, a plan, a canal: Panama$tci$, $tco$true$tco$, false),
  ($tci$race a car$tci$, $tco$false$tco$, true),
  ($tci$ $tci$, $tco$true$tco$, true),
  ($tci$0P$tci$, $tco$false$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'valid-palindrome'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- FizzBuzz Range
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$FizzBuzz Range$t$,
  'fizzbuzz-range',
  $desc$Given two integers `n1` and `n2`, print the FizzBuzz sequence for every integer from `n1` to `n2` inclusive: `Fizz` if divisible by 3, `Buzz` if divisible by 5, `FizzBuzz` if divisible by both, otherwise the number itself.$desc$,
  'easy',
  (select id from challenge_categories where slug = 'algorithms'),
  8,
  10,
  ARRAY['basics','easy'],
  $cons$1 <= n1 <= n2 <= 100000.$cons$,
  $inf$Two integers on one line, space-separated: n1 n2.$inf$,
  $outf$One value per line, from n1 to n2 inclusive.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n1, n2] = lines[0].split(' ').map(Number);\n\n// TODO: print FizzBuzz for n1..n2, one per line\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nn1, n2 = [int(x) for x in lines[0].split(' ')]\n\n# TODO: print FizzBuzz for n1..n2, one per line\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$1 15$tci$, $tco$1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz$tco$, false),
  ($tci$16 20$tci$, $tco$16
17
Fizz
19
Buzz$tco$, true),
  ($tci$3 3$tci$, $tco$Fizz$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'fizzbuzz-range'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Maximum Subarray
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Maximum Subarray$t$,
  'maximum-subarray',
  $desc$Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum, and return that sum.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'algorithms'),
  15,
  20,
  ARRAY['arrays','dynamic-programming','kadane'],
  $cons$1 <= nums.length <= 100000. -10^4 <= nums[i] <= 10^4.$cons$,
  $inf$Comma-separated integers (may be negative).$inf$,
  $outf$A single integer — the maximum sum of a contiguous subarray.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst nums = lines[0].split(',').map(Number);\n\n// TODO: Kadane's algorithm\n// console.log(best);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nnums = [int(x) for x in lines[0].split(',')]\n\n# TODO: Kadane's algorithm\n# print(best)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$-2,1,-3,4,-1,2,1,-5,4$tci$, $tco$6$tco$, false),
  ($tci$1$tci$, $tco$1$tco$, true),
  ($tci$-1,-2,-3$tci$, $tco$-1$tco$, true),
  ($tci$5,4,-1,7,8$tci$, $tco$23$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'maximum-subarray'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Climbing Stairs
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Climbing Stairs$t$,
  'climbing-stairs',
  $desc$You are climbing a staircase with `n` steps. Each time you can climb either 1 or 2 steps. In how many distinct ways can you climb to the top?$desc$,
  'easy',
  (select id from challenge_categories where slug = 'dynamic-programming'),
  10,
  15,
  ARRAY['dynamic-programming','easy'],
  $cons$1 <= n <= 45.$cons$,
  $inf$A single integer n.$inf$,
  $outf$A single integer — the number of distinct ways to reach the top.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\n\n// TODO: fibonacci-style DP\n// console.log(ways);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nn = int(lines[0])\n\n# TODO: fibonacci-style DP\n# print(ways)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$2$tci$, $tco$2$tco$, false),
  ($tci$3$tci$, $tco$3$tco$, true),
  ($tci$5$tci$, $tco$8$tco$, true),
  ($tci$1$tci$, $tco$1$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'climbing-stairs'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Binary Search
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Binary Search$t$,
  'binary-search',
  $desc$Given a sorted (ascending) array of unique integers `nums` and an integer `target`, return the index of target if it exists, or -1 otherwise. Your solution must run in O(log n) time.$desc$,
  'easy',
  (select id from challenge_categories where slug = 'algorithms'),
  10,
  10,
  ARRAY['binary-search','easy'],
  $cons$1 <= nums.length <= 100000. nums is sorted in strictly ascending order.$cons$,
  $inf$Line 1: comma-separated sorted ascending integers. Line 2: target integer.$inf$,
  $outf$The index of target in the array (0-based), or -1 if not present.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst nums = lines[0].split(',').map(Number);\nconst target = Number(lines[1]);\n\n// TODO: binary search\n// console.log(index);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nnums = [int(x) for x in lines[0].split(',')]\ntarget = int(lines[1])\n\n# TODO: binary search\n# print(index)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$-1,0,3,5,9,12
9$tci$, $tco$4$tco$, false),
  ($tci$-1,0,3,5,9,12
2$tci$, $tco$-1$tco$, true),
  ($tci$5
5$tci$, $tco$0$tco$, true),
  ($tci$1,2,3,4,5
1$tci$, $tco$0$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'binary-search'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Binary Tree Level Order Traversal
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Binary Tree Level Order Traversal$t$,
  'binary-tree-level-order-traversal',
  $desc$Given the root of a binary tree serialized in level order (comma-separated, using the literal `null` for a missing child of an existing node — the standard LeetCode serialization), return the level order traversal of its nodes' values (i.e., from left to right, level by level).$desc$,
  'medium',
  (select id from challenge_categories where slug = 'trees'),
  25,
  25,
  ARRAY['trees','bfs'],
  $cons$0 <= number of nodes <= 2000. The serialization only includes null markers for missing children of nodes that exist (not for entire missing subtrees beyond that).$cons$,
  $inf$One line: comma-separated values in level-order, with `null` for a missing child of an existing node, e.g. `3,9,20,null,null,15,7`.$inf$,
  $outf$Each level's values joined by `,`, and levels separated by `;`, e.g. `3;9,20;15,7`.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst tokens = lines[0].split(',').map(t => t.trim());\n\n// TODO: rebuild the tree from level-order tokens (skip 'null'),\n// then BFS level by level and print levels joined by ';', values by ','.\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ntokens = [t.strip() for t in lines[0].split(',')]\n\n# TODO: rebuild the tree from level-order tokens (skip 'null'),\n# then BFS level by level and print levels joined by ';', values by ','.\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$3,9,20,null,null,15,7$tci$, $tco$3;9,20;15,7$tco$, false),
  ($tci$1$tci$, $tco$1$tco$, true),
  ($tci$1,2,3,4,null,null,5$tci$, $tco$1;2,3;4,5$tco$, true),
  ($tci$1,null,2,null,3$tci$, $tco$1;2;3$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'binary-tree-level-order-traversal'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Longest Substring Without Repeating Characters
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Longest Substring Without Repeating Characters$t$,
  'longest-substring-without-repeating-characters',
  $desc$Given a string `s`, find the length of the longest substring without repeating characters.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'strings'),
  20,
  20,
  ARRAY['strings','sliding-window'],
  $cons$0 <= s.length <= 50000.$cons$,
  $inf$A single line string s (may be empty).$inf$,
  $outf$A single integer — the length of the longest substring without repeating characters.$outf$,
  $sc${"javascript":"const raw = require('fs').readFileSync(0, 'utf8');\nconst s = raw.split('\\n')[0] ?? '';\n\n// TODO: sliding window with a map of last-seen index\n// console.log(best);\n","python":"import sys\nraw = sys.stdin.read()\ns = raw.split('\\n')[0] if raw else ''\n\n# TODO: sliding window with a dict of last-seen index\n# print(best)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$abcabcbb$tci$, $tco$3$tco$, false),
  ($tci$bbbbb$tci$, $tco$1$tco$, true),
  ($tci$pwwkew$tci$, $tco$3$tco$, true),
  ($tci$$tci$, $tco$0$tco$, true),
  ($tci$dvdf$tci$, $tco$3$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'longest-substring-without-repeating-characters'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Merge Intervals
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Merge Intervals$t$,
  'merge-intervals',
  $desc$Given a collection of intervals, merge all overlapping intervals and return the resulting non-overlapping intervals sorted by start.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'arrays'),
  20,
  20,
  ARRAY['arrays','sorting','intervals'],
  $cons$1 <= number of intervals <= 10000. Each interval is start-end with start <= end.$cons$,
  $inf$Comma-separated intervals, each formatted as `start-end`, e.g. `1-3,2-6,8-10,15-18`.$inf$,
  $outf$The merged intervals in the same `start-end` format, comma-separated, sorted by start ascending.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst intervals = lines[0].split(',').map(p => p.split('-').map(Number));\n\n// TODO: sort by start, then merge overlapping intervals\n// console.log(merged.map(([s,e]) => s + '-' + e).join(','));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nintervals = [[int(x) for x in p.split('-')] for p in lines[0].split(',')]\n\n# TODO: sort by start, then merge overlapping intervals\n# print(','.join(str(s) + '-' + str(e) for s, e in merged))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$1-3,2-6,8-10,15-18$tci$, $tco$1-6,8-10,15-18$tco$, false),
  ($tci$1-4,4-5$tci$, $tco$1-5$tco$, true),
  ($tci$1-4,0-4$tci$, $tco$0-4$tco$, true),
  ($tci$1-4,2-3$tci$, $tco$1-4$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'merge-intervals'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- SQL: Second Highest Salary
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$SQL: Second Highest Salary$t$,
  'sql-second-highest-salary',
  $desc$Table `employee(id INTEGER, name TEXT, salary INTEGER, department TEXT)`.

Write a single SELECT statement that returns the second-highest **distinct** salary in the table. You may assume at least two distinct salary values always exist. Your query runs against a freshly created table for each test — you only need to write the SELECT, the schema and data are already set up above your query.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'sql'),
  20,
  25,
  ARRAY['sql','aggregation'],
  $cons$The `employee` table always has at least 2 distinct salary values in every test case.$cons$,
  $inf$No stdin — the employee table is created and populated for you before your query runs.$inf$,
  $outf$A single value: the second-highest distinct salary.$outf$,
  $sc${"sqlite3":"-- Table: employee(id, name, salary, department)\n-- Return the second-highest DISTINCT salary. Assume it always exists.\n\nSELECT 0; -- TODO: replace with your query\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'Alice',9000,'Eng'),(2,'Bob',8000,'Eng'),(3,'Carl',9500,'Eng'),(4,'Dee',7000,'Sales');$tci$, $tco$9000$tco$, false),
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'A',100,'X'),(2,'B',100,'X'),(3,'C',90,'X');$tci$, $tco$90$tco$, true),
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'A',50,'X'),(2,'B',70,'X');$tci$, $tco$50$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'sql-second-highest-salary'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Group Anagrams
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Group Anagrams$t$,
  'group-anagrams',
  $desc$Given a list of lowercase words, group the anagrams together. Two words are anagrams if one's letters can be rearranged to form the other.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'strings'),
  20,
  20,
  ARRAY['strings','hash-map','sorting'],
  $cons$1 <= number of words <= 5000. Words contain only lowercase letters.$cons$,
  $inf$Comma-separated words with no spaces, e.g. `eat,tea,tan,ate,nat,bat`.$inf$,
  $outf$Each group's words joined by `+` in their original relative order; groups separated by `;`, ordered by the position of each group's first occurrence in the input.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst words = lines[0].split(',');\n\n// TODO: group by sorted-letters key, preserving first-occurrence order\n// console.log(groups.map(g => g.join('+')).join(';'));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nwords = lines[0].split(',')\n\n# TODO: group by sorted-letters key, preserving first-occurrence order\n# print(';'.join('+'.join(g) for g in groups))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$eat,tea,tan,ate,nat,bat$tci$, $tco$eat+tea+ate;tan+nat;bat$tco$, false),
  ($tci$a$tci$, $tco$a$tco$, true),
  ($tci$abc,bca,cab,xyz$tci$, $tco$abc+bca+cab;xyz$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'group-anagrams'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Number of Islands
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Number of Islands$t$,
  'number-of-islands',
  $desc$Given an `m x n` binary grid where `1` represents land and `0` represents water, return the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically (4-directional).$desc$,
  'medium',
  (select id from challenge_categories where slug = 'graphs'),
  25,
  25,
  ARRAY['graphs','dfs','grid'],
  $cons$1 <= rows, cols <= 300.$cons$,
  $inf$Grid rows separated by `;`, cells within a row separated by `,` (1 = land, 0 = water).$inf$,
  $outf$A single integer — the number of islands.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst grid = lines[0].split(';').map(row => row.split(',').map(Number));\n\n// TODO: DFS/BFS flood fill, count connected components of 1s\n// console.log(count);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ngrid = [[int(x) for x in row.split(',')] for row in lines[0].split(';')]\n\n# TODO: DFS/BFS flood fill, count connected components of 1s\n# print(count)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$1,1,0,0,0;1,1,0,0,0;0,0,1,0,0;0,0,0,1,1$tci$, $tco$3$tco$, false),
  ($tci$1,0;0,1$tci$, $tco$2$tco$, true),
  ($tci$1,1;1,1$tci$, $tco$1$tco$, true),
  ($tci$0,0;0,0$tci$, $tco$0$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'number-of-islands'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Debounce Simulation
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Debounce Simulation$t$,
  'debounce-simulation',
  $desc$A debounced function (trailing edge) only actually executes `d` milliseconds after the *last* call in a burst — if a new call arrives before the scheduled execution, the timer resets.

Given a strictly increasing list of call timestamps (ms) and a delay `d`, simulate this: consecutive calls belong to the same 'burst' if the gap between them is <= d. Each burst resolves to one execution, at `(last call time in the burst) + d`.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'javascript'),
  20,
  20,
  ARRAY['javascript','closures','event-loop'],
  $cons$1 <= number of calls <= 1000. Timestamps strictly increasing, >= 0. 1 <= d <= 100000.$cons$,
  $inf$Line 1: comma-separated call timestamps (ms), strictly increasing. Line 2: integer d (delay in ms).$inf$,
  $outf$Comma-separated resolved execution times, one per burst, in order.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst calls = lines[0].split(',').map(Number);\nconst d = Number(lines[1]);\n\n// TODO: group calls into bursts (gap <= d), emit lastInBurst + d for each\n// console.log(results.join(','));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ncalls = [int(x) for x in lines[0].split(',')]\nd = int(lines[1])\n\n# TODO: group calls into bursts (gap <= d), emit lastInBurst + d for each\n# print(','.join(str(x) for x in results))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$0,100,150,2000,2050
200$tci$, $tco$350,2250$tco$, false),
  ($tci$10
50$tci$, $tco$60$tco$, true),
  ($tci$0,50,100,150
40$tci$, $tco$40,90,140,190$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'debounce-simulation'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Shallow Props Equality
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Shallow Props Equality$t$,
  'shallow-props-equality',
  $desc$`React.memo`'s default comparator does a shallow equality check between the previous and next props. Given two flat JSON objects of primitive-valued props with the same set of keys, implement that shallow comparison: return true only if every key has a strictly-equal (`===`) value in both objects.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'react'),
  15,
  20,
  ARRAY['react','memoization'],
  $cons$Both objects have the same set of keys. Values are strings, numbers, or booleans (no nested objects/arrays).$cons$,
  $inf$Line 1: JSON object — previous props. Line 2: JSON object — next props.$inf$,
  $outf$Print `true` or `false`.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst prev = JSON.parse(lines[0]);\nconst next = JSON.parse(lines[1]);\n\n// TODO: compare every key with ===\n// console.log(equal);\n","python":"import sys, json\nlines = sys.stdin.read().split('\\n')\nprev = json.loads(lines[0])\nnext_ = json.loads(lines[1])\n\n# TODO: compare every key for equality\n# print('true' if equal else 'false')\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci${"a":1,"b":"x"}
{"a":1,"b":"x"}$tci$, $tco$true$tco$, false),
  ($tci${"a":1,"b":"x"}
{"a":1,"b":"y"}$tci$, $tco$false$tco$, true),
  ($tci${"count":0}
{"count":0}$tci$, $tco$true$tco$, true),
  ($tci${"x":1,"y":2}
{"x":1,"y":3}$tci$, $tco$false$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'shallow-props-equality'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Validate Binary Search Tree
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Validate Binary Search Tree$t$,
  'validate-binary-search-tree',
  $desc$Given the root of a binary tree serialized in level order (same format as the level-order traversal problem — comma-separated, `null` for a missing child of an existing node), determine if it is a valid binary search tree.

A valid BST: every node's value is strictly greater than all values in its left subtree and strictly less than all values in its right subtree (no duplicate values).$desc$,
  'medium',
  (select id from challenge_categories where slug = 'trees'),
  20,
  25,
  ARRAY['trees','recursion'],
  $cons$0 <= number of nodes <= 5000.$cons$,
  $inf$One line: level-order serialization, e.g. `5,1,4,null,null,3,6`.$inf$,
  $outf$Print `true` or `false`.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst tokens = lines[0].split(',').map(t => t.trim());\n\n// TODO: rebuild the tree from level-order tokens, then validate with (lo, hi) bounds recursion\n// console.log(isValid);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ntokens = [t.strip() for t in lines[0].split(',')]\n\n# TODO: rebuild the tree from level-order tokens, then validate with (lo, hi) bounds recursion\n# print('true' if is_valid else 'false')\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$2,1,3$tci$, $tco$true$tco$, false),
  ($tci$5,1,4,null,null,3,6$tci$, $tco$false$tco$, true),
  ($tci$1$tci$, $tco$true$tco$, true),
  ($tci$1,1$tci$, $tco$false$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'validate-binary-search-tree'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Word Frequency Counter
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Word Frequency Counter$t$,
  'word-frequency-counter',
  $desc$Given a line of space-separated lowercase words (no punctuation), count how many times each distinct word occurs. Output the words sorted by count descending; break ties alphabetically ascending.$desc$,
  'medium',
  (select id from challenge_categories where slug = 'python'),
  15,
  20,
  ARRAY['python','strings','sorting'],
  $cons$1 <= number of words <= 10000. Words contain only lowercase letters.$cons$,
  $inf$A single line of space-separated lowercase words.$inf$,
  $outf$Comma-separated `word:count` pairs, sorted by count desc then word asc, e.g. `the:3,fox:2`.$outf$,
  $sc${"python":"import sys\nlines = sys.stdin.read().split('\\n')\nwords = [w for w in lines[0].split(' ') if w]\n\n# TODO: count occurrences, sort by (-count, word), format as word:count\n# print(','.join(w + ':' + str(c) for w, c in ordered))\n","javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst words = lines[0].split(' ').filter(Boolean);\n\n// TODO: count occurrences, sort by (-count, word), format as word:count\n// console.log(ordered.map(([w,c]) => w + ':' + c).join(','));\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$the quick brown fox the lazy dog the fox$tci$, $tco$the:3,fox:2,brown:1,dog:1,lazy:1,quick:1$tco$, false),
  ($tci$a a a b b c$tci$, $tco$a:3,b:2,c:1$tco$, true),
  ($tci$x y z$tci$, $tco$x:1,y:1,z:1$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'word-frequency-counter'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- SQL: Top 2 Salaries Per Department
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$SQL: Top 2 Salaries Per Department$t$,
  'sql-top-2-per-department',
  $desc$Table `employee(id INTEGER, name TEXT, salary INTEGER, department TEXT)`.

Write a query that returns the top 2 salaries in each department (by salary descending; assume no ties at the cutoff within a test case). Order the output rows by department ascending, then salary descending. Print each row as `department,salary` (use string concatenation in your SELECT so the output has no extra separators).$desc$,
  'hard',
  (select id from challenge_categories where slug = 'sql'),
  30,
  35,
  ARRAY['sql','window-functions'],
  $cons$Every department in every test case has at least 1 employee; no ties occur exactly at the 2nd/3rd-place cutoff.$cons$,
  $inf$No stdin — the employee table is created and populated for you before your query runs.$inf$,
  $outf$One line per result row: `department,salary`, ordered by department asc then salary desc.$outf$,
  $sc${"sqlite3":"-- Table: employee(id, name, salary, department)\n-- Return the top 2 salaries per department.\n-- Print one row per result as: department || ',' || salary\n-- Ordered by department asc, then salary desc.\n\nSELECT 'TODO'; -- replace with your query\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'Alice',9000,'Eng'),(2,'Bob',8000,'Eng'),(3,'Carl',9500,'Eng'),(4,'Dee',7000,'Sales'),(5,'Ed',7500,'Sales'),(6,'Fay',6000,'Sales');$tci$, $tco$Eng,9500
Eng,9000
Sales,7500
Sales,7000$tco$, false),
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'A',100,'X'),(2,'B',90,'X'),(3,'C',80,'X');$tci$, $tco$X,100
X,90$tco$, true),
  ($tci$CREATE TABLE employee (id INTEGER, name TEXT, salary INTEGER, department TEXT);
INSERT INTO employee VALUES (1,'A',50,'P'),(2,'B',60,'Q');$tci$, $tco$P,50
Q,60$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'sql-top-2-per-department'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Coin Change
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Coin Change$t$,
  'coin-change',
  $desc$Given an array of coin denominations and a target `amount`, return the fewest number of coins needed to make up that amount. If it's impossible, return -1. You may assume an unlimited supply of each coin.$desc$,
  'hard',
  (select id from challenge_categories where slug = 'dynamic-programming'),
  30,
  35,
  ARRAY['dynamic-programming','hard'],
  $cons$1 <= coins.length <= 20. 0 <= amount <= 10000.$cons$,
  $inf$Line 1: comma-separated coin denominations. Line 2: target amount.$inf$,
  $outf$A single integer — the minimum number of coins, or -1 if impossible.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst coins = lines[0].split(',').map(Number);\nconst amount = Number(lines[1]);\n\n// TODO: classic unbounded-knapsack DP over amounts 0..amount\n// console.log(result);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ncoins = [int(x) for x in lines[0].split(',')]\namount = int(lines[1])\n\n# TODO: classic unbounded-knapsack DP over amounts 0..amount\n# print(result)\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$1,2,5
11$tci$, $tco$3$tco$, false),
  ($tci$2
3$tci$, $tco$-1$tco$, true),
  ($tci$1
0$tci$, $tco$0$tco$, true),
  ($tci$1,3,4
6$tci$, $tco$2$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'coin-change'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Course Schedule
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Course Schedule$t$,
  'course-schedule',
  $desc$There are `numCourses` courses labeled 0 to numCourses-1. Some courses have prerequisites, given as pairs `a-b` meaning you must take course `b` before course `a`. Determine if it's possible to finish all courses (i.e., the prerequisite graph has no cycle).$desc$,
  'hard',
  (select id from challenge_categories where slug = 'graphs'),
  30,
  35,
  ARRAY['graphs','topological-sort','cycle-detection'],
  $cons$1 <= numCourses <= 2000. 0 <= number of prerequisite pairs <= 5000.$cons$,
  $inf$Line 1: integer numCourses. Line 2: comma-separated prerequisite pairs formatted `a-b` (empty line if there are none).$inf$,
  $outf$Print `true` if all courses can be finished, `false` if there is a cycle.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst numCourses = Number(lines[0]);\nconst pairs = (lines[1] || '').split(',').filter(Boolean).map(p => p.split('-').map(Number));\n\n// TODO: build adjacency list, DFS with 3-color cycle detection (or Kahn's algorithm)\n// console.log(canFinish);\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nnum_courses = int(lines[0])\nraw = lines[1] if len(lines) > 1 else ''\npairs = [[int(x) for x in p.split('-')] for p in raw.split(',') if p]\n\n# TODO: build adjacency list, DFS with 3-color cycle detection (or Kahn's algorithm)\n# print('true' if can_finish else 'false')\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$2
1-0$tci$, $tco$true$tco$, false),
  ($tci$2
1-0,0-1$tci$, $tco$false$tco$, true),
  ($tci$4
1-0,2-0,3-1,3-2$tci$, $tco$true$tco$, true),
  ($tci$1
$tci$, $tco$true$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'course-schedule'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- Rate Limiter: Token Bucket Simulation
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code, is_premium)
values (
  $t$Rate Limiter: Token Bucket Simulation$t$,
  'rate-limiter-token-bucket',
  $desc$Simulate a token-bucket rate limiter. The bucket starts full (`capacity` tokens) at time 0. Tokens refill continuously at `refillRate` tokens/second, capped at `capacity`.

For each request (given in non-decreasing arrival order), first add tokens accumulated since the last request (`(t - lastTime) * refillRate`, floored implicitly since all test inputs use integer arithmetic that divides evenly), capped at capacity. If at least 1 token is available, ALLOW the request and consume 1 token; otherwise DENY it. Update `lastTime` to the current request time after every request, whether allowed or denied.$desc$,
  'hard',
  (select id from challenge_categories where slug = 'system-design'),
  35,
  40,
  ARRAY['system-design','rate-limiting','simulation'],
  $cons$1 <= capacity <= 1000. 1 <= refillRate <= 1000. Arrival times are non-negative integers in non-decreasing order.$cons$,
  $inf$Line 1: `capacity refillRate` (two integers, space-separated). Line 2: comma-separated non-decreasing request arrival times (seconds), starting effectively from a full bucket at time 0.$inf$,
  $outf$Comma-separated `ALLOW`/`DENY` decisions, one per request, in arrival order.$outf$,
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [capacity, refillRate] = lines[0].split(' ').map(Number);\nconst arrivals = lines[1].split(',').map(Number);\n\n// TODO: simulate the token bucket, refilling on each arrival before deciding ALLOW/DENY\n// console.log(decisions.join(','));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\ncapacity, refill_rate = [int(x) for x in lines[0].split(' ')]\narrivals = [int(x) for x in lines[1].split(',')]\n\n# TODO: simulate the token bucket, refilling on each arrival before deciding ALLOW/DENY\n# print(','.join(decisions))\n"}$sc$::jsonb,
  false
)
on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c
cross join (values
  ($tci$5 1
0,0,0,0,0,0$tci$, $tco$ALLOW,ALLOW,ALLOW,ALLOW,ALLOW,DENY$tco$, false),
  ($tci$2 1
0,1,2$tci$, $tco$ALLOW,ALLOW,ALLOW$tco$, true),
  ($tci$1 1
0,0,1,1$tci$, $tco$ALLOW,DENY,ALLOW,DENY$tco$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'rate-limiter-token-bucket'
  and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

