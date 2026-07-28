-- =====================================================================
-- Seed real, hand-verified problems for the 9 pattern topics that had
-- zero questions: greedy, recursion, backtracking, hash-maps, stacks,
-- queues, binary-search, sliding-window, two-pointers (3 each).
-- Every expected_output below was worked out by hand/step-through, not
-- guessed — see inline comments for the trace on the non-trivial ones.
-- =====================================================================

-- ---------------------------------------------------------------------
-- GREEDY
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Minimum Coins',
  'greedy-minimum-coins',
  'Given an amount, find the minimum number of coins needed to make that amount using denominations {1, 2, 5, 10, 20, 50, 100}, always taking the largest denomination that fits (greedy works for this canonical coin system).',
  'easy',
  (select id from challenge_categories where slug = 'greedy'),
  15, 20,
  array['greedy', 'coins'],
  '1 <= amount <= 100000',
  'A single integer: amount.',
  'A single integer: the minimum number of coins.',
  $sc${"javascript":"const amount = Number(require('fs').readFileSync(0, 'utf8').trim());\nconst coins = [100,50,20,10,5,2,1];\nlet remaining = amount, count = 0;\n// TODO: for each coin from largest to smallest, take as many as fit\nconsole.log(count);\n","python":"amount = int(input())\ncoins = [100,50,20,10,5,2,1]\nremaining, count = amount, 0\n# TODO: for each coin from largest to smallest, take as many as fit\nprint(count)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Jump Game Reachability',
  'greedy-jump-game',
  'Given an array where each element is the maximum jump length from that position, determine whether you can reach the last index starting from index 0.',
  'medium',
  (select id from challenge_categories where slug = 'greedy'),
  20, 50,
  array['greedy', 'arrays'],
  '1 <= n <= 10000, 0 <= nums[i] <= 10000',
  'Line 1: n. Line 2: n space-separated integers.',
  '"YES" if the last index is reachable, otherwise "NO".',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst nums = lines[1].trim().split(' ').map(Number);\n// TODO: track the farthest index reachable so far\nconsole.log('NO');\n","python":"n = int(input())\nnums = list(map(int, input().split()))\n# TODO: track the farthest index reachable so far\nprint('NO')\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Assign Cookies',
  'greedy-assign-cookies',
  'Each child i has a greed factor g[i] (minimum cookie size that satisfies them). Each cookie j has a size s[j]. A cookie satisfies a child if its size is >= the child''s greed factor. Maximize the number of content children (each cookie used at most once).',
  'easy',
  (select id from challenge_categories where slug = 'greedy'),
  20, 20,
  array['greedy', 'two-pointers'],
  '1 <= n, m <= 10000',
  'Line 1: n m. Line 2: n integers (greed factors). Line 3: m integers (cookie sizes).',
  'A single integer: the maximum number of content children.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, m] = lines[0].trim().split(' ').map(Number);\nconst g = lines[1].trim().split(' ').map(Number).sort((a,b)=>a-b);\nconst s = lines[2].trim().split(' ').map(Number).sort((a,b)=>a-b);\n// TODO: two-pointer greedy match\nconsole.log(0);\n","python":"n, m = map(int, input().split())\ng = sorted(map(int, input().split()))\ns = sorted(map(int, input().split()))\n# TODO: two-pointer greedy match\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$93$i$, $o$5$o$, false),   -- 50+20+20+2+1
  ($i$7$i$,  $o$2$o$, true),    -- 5+2
  ($i$1$i$,  $o$1$o$, true),
  ($i$100$i$,$o$1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'greedy-minimum-coins' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$5
2 3 1 1 4$i$, $o$YES$o$, false),
  ($i$5
3 2 1 0 4$i$, $o$NO$o$, true),
  ($i$1
0$i$, $o$YES$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'greedy-jump-game' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$2 2
1 2
1 3$i$, $o$2$o$, false),
  ($i$3 1
1 2 3
2$i$, $o$1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'greedy-assign-cookies' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- RECURSION
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Factorial',
  'recursion-factorial',
  'Compute n! (factorial of n) using recursion.',
  'easy',
  (select id from challenge_categories where slug = 'recursion'),
  10, 20,
  array['recursion', 'math'],
  '0 <= n <= 15',
  'A single integer: n.',
  'A single integer: n factorial.',
  $sc${"javascript":"const n = Number(require('fs').readFileSync(0, 'utf8').trim());\nfunction fact(k) {\n  // TODO: base case + recursive case\n}\nconsole.log(fact(n));\n","python":"n = int(input())\ndef fact(k):\n    pass  # TODO: base case + recursive case\nprint(fact(n))\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Nth Fibonacci Number',
  'recursion-fibonacci',
  'Compute the nth Fibonacci number (F(0)=0, F(1)=1, F(k)=F(k-1)+F(k-2)) using recursion (memoize to avoid timing out for larger n).',
  'easy',
  (select id from challenge_categories where slug = 'recursion'),
  15, 20,
  array['recursion', 'dynamic-programming'],
  '0 <= n <= 30',
  'A single integer: n.',
  'A single integer: F(n).',
  $sc${"javascript":"const n = Number(require('fs').readFileSync(0, 'utf8').trim());\nconst memo = {};\nfunction fib(k) {\n  // TODO: base cases 0 and 1, memoized recursive case\n}\nconsole.log(fib(n));\n","python":"n = int(input())\nfrom functools import lru_cache\n@lru_cache(maxsize=None)\ndef fib(k):\n    pass  # TODO: base cases 0 and 1, recursive case\nprint(fib(n))\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Tower of Hanoi Moves',
  'recursion-tower-of-hanoi',
  'Given n disks, output the minimum number of moves required to solve the Tower of Hanoi puzzle.',
  'easy',
  (select id from challenge_categories where slug = 'recursion'),
  10, 20,
  array['recursion', 'math'],
  '1 <= n <= 30',
  'A single integer: n.',
  'A single integer: minimum number of moves (2^n - 1).',
  $sc${"javascript":"const n = Number(require('fs').readFileSync(0, 'utf8').trim());\nfunction moves(k) {\n  // TODO: base case n=0, recursive relation moves(k) = 2*moves(k-1) + 1\n}\nconsole.log(moves(n));\n","python":"n = int(input())\ndef moves(k):\n    pass  # TODO: base case n=0, recursive relation moves(k) = 2*moves(k-1) + 1\nprint(moves(n))\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$5$i$, $o$120$o$, false),
  ($i$0$i$, $o$1$o$, true),
  ($i$10$i$, $o$3628800$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'recursion-factorial' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$10$i$, $o$55$o$, false),
  ($i$0$i$, $o$0$o$, true),
  ($i$1$i$, $o$1$o$, true),
  ($i$20$i$, $o$6765$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'recursion-fibonacci' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$3$i$, $o$7$o$, false),
  ($i$1$i$, $o$1$o$, true),
  ($i$4$i$, $o$15$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'recursion-tower-of-hanoi' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- BACKTRACKING
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Count Subsets With Given Sum',
  'backtracking-subset-sum-count',
  'Given an array of n positive integers and a target sum, count how many subsets (chosen by index; duplicate values are treated as distinct elements) sum exactly to the target.',
  'medium',
  (select id from challenge_categories where slug = 'backtracking'),
  25, 50,
  array['backtracking', 'recursion'],
  '1 <= n <= 20, 1 <= target <= 1000',
  'Line 1: n target. Line 2: n space-separated integers.',
  'A single integer: the number of subsets summing to target.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, target] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: backtrack over include/exclude each index\nconsole.log(0);\n","python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: backtrack over include/exclude each index\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Count All Subsets',
  'backtracking-count-subsets',
  'Given n, output the total number of subsets of a set with n elements (including the empty set), generated conceptually via backtracking''s include/exclude decision at each element.',
  'easy',
  (select id from challenge_categories where slug = 'backtracking'),
  10, 20,
  array['backtracking', 'math'],
  '0 <= n <= 30',
  'A single integer: n.',
  'A single integer: 2^n.',
  $sc${"javascript":"const n = Number(require('fs').readFileSync(0, 'utf8').trim());\n// TODO: 2 raised to the power n\nconsole.log(0);\n","python":"n = int(input())\n# TODO: 2 raised to the power n\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'N-Queens Count',
  'backtracking-n-queens-count',
  'Given n, count the number of distinct ways to place n non-attacking queens on an n x n chessboard, using backtracking.',
  'hard',
  (select id from challenge_categories where slug = 'backtracking'),
  35, 100,
  array['backtracking', 'chess'],
  '1 <= n <= 9',
  'A single integer: n.',
  'A single integer: the number of distinct solutions.',
  $sc${"javascript":"const n = Number(require('fs').readFileSync(0, 'utf8').trim());\n// TODO: backtrack placing one queen per row, checking column/diagonal conflicts\nconsole.log(0);\n","python":"n = int(input())\n# TODO: backtrack placing one queen per row, checking column/diagonal conflicts\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  -- arr=[1,2,3], target=3 -> {1,2} and {3} => 2
  ($i$3 3
1 2 3$i$, $o$2$o$, false),
  -- arr=[1,1,2,3] idx0..3, target=3 -> {idx0,idx2}=1+2, {idx1,idx2}=1+2, {idx3}=3 => 3
  ($i$4 3
1 1 2 3$i$, $o$3$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'backtracking-subset-sum-count' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$3$i$, $o$8$o$, false),
  ($i$0$i$, $o$1$o$, true),
  ($i$5$i$, $o$32$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'backtracking-count-subsets' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$4$i$, $o$2$o$, false),
  ($i$1$i$, $o$1$o$, true),
  ($i$5$i$, $o$10$o$, true),
  ($i$8$i$, $o$92$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'backtracking-n-queens-count' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- HASH MAPS
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Two Sum Indices',
  'hash-maps-two-sum',
  'Given an array and a target, find the 0-based indices of the two numbers that add up to target. Exactly one valid pair exists.',
  'easy',
  (select id from challenge_categories where slug = 'hash-maps'),
  15, 20,
  array['hash-maps', 'arrays'],
  '2 <= n <= 10000',
  'Line 1: n target. Line 2: n space-separated integers.',
  'Two space-separated integers: the two indices, smaller first.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, target] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: use a hash map of value -> index\nconsole.log('');\n","python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: use a hash map of value -> index\nprint('')\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'First Non-Repeating Character',
  'hash-maps-first-unique-char',
  'Given a lowercase string, output the 0-based index of the first character that does not repeat anywhere else in the string. Output -1 if every character repeats.',
  'easy',
  (select id from challenge_categories where slug = 'hash-maps'),
  15, 20,
  array['hash-maps', 'strings'],
  '1 <= length <= 100000',
  'A single line: the string.',
  'A single integer: the index, or -1.',
  $sc${"javascript":"const s = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: count occurrences, then scan for the first with count 1\nconsole.log(-1);\n","python":"s = input().strip()\n# TODO: count occurrences, then scan for the first with count 1\nprint(-1)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Group Anagrams Count',
  'hash-maps-group-anagrams-count',
  'Given n lowercase words, group them by anagram (same letters, any order) and output the number of distinct groups.',
  'medium',
  (select id from challenge_categories where slug = 'hash-maps'),
  20, 50,
  array['hash-maps', 'strings'],
  '1 <= n <= 10000',
  'Line 1: n. Line 2: n space-separated lowercase words.',
  'A single integer: the number of anagram groups.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst words = lines[1].trim().split(' ');\n// TODO: map each word to its sorted-letters key, count distinct keys\nconsole.log(0);\n","python":"n = int(input())\nwords = input().split()\n# TODO: map each word to its sorted-letters key, count distinct keys\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$4 9
2 7 11 15$i$, $o$0 1$o$, false),
  ($i$3 6
3 2 4$i$, $o$1 2$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'hash-maps-two-sum' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$leetcode$i$, $o$0$o$, false),
  ($i$aabb$i$, $o$-1$o$, true),
  ($i$loveleetcode$i$, $o$2$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'hash-maps-first-unique-char' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$4
eat tea tan ate$i$, $o$2$o$, false),
  ($i$3
abc cba xyz$i$, $o$2$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'hash-maps-group-anagrams-count' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- STACKS
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Valid Parentheses',
  'stacks-valid-parentheses',
  'Given a string containing only ()[]{},  determine if the brackets are balanced and correctly nested.',
  'easy',
  (select id from challenge_categories where slug = 'stacks'),
  10, 20,
  array['stacks', 'strings'],
  '1 <= length <= 10000',
  'A single line: the string.',
  '"true" if balanced, otherwise "false".',
  $sc${"javascript":"const s = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: push opening brackets, pop and match on closing brackets\nconsole.log('false');\n","python":"s = input().strip()\n# TODO: push opening brackets, pop and match on closing brackets\nprint('false')\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Next Greater Element',
  'stacks-next-greater-element',
  'For each element in the array, find the next element to its right that is strictly greater. Output -1 if none exists. (Classic monotonic-stack problem.)',
  'medium',
  (select id from challenge_categories where slug = 'stacks'),
  20, 50,
  array['stacks', 'arrays'],
  '1 <= n <= 10000',
  'Line 1: n. Line 2: n space-separated integers.',
  'n space-separated integers: the next greater element for each position.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: use a monotonic decreasing stack of indices\nconsole.log(arr.map(() => -1).join(' '));\n","python":"n = int(input())\narr = list(map(int, input().split()))\n# TODO: use a monotonic decreasing stack of indices\nprint(' '.join(['-1'] * n))\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Evaluate Postfix Expression',
  'stacks-evaluate-postfix',
  'Evaluate a postfix (Reverse Polish Notation) arithmetic expression made of integers and the operators + - * / (integer division), using a stack.',
  'medium',
  (select id from challenge_categories where slug = 'stacks'),
  20, 50,
  array['stacks', 'math'],
  'Tokens are space-separated; the expression is always valid.',
  'A single line: space-separated tokens of the postfix expression.',
  'A single integer: the evaluated result.',
  $sc${"javascript":"const tokens = require('fs').readFileSync(0, 'utf8').trim().split(' ');\n// TODO: push numbers; on an operator, pop two, apply it, push the result\nconsole.log(0);\n","python":"tokens = input().split()\n# TODO: push numbers; on an operator, pop two, apply it, push the result\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$()[]{}$i$, $o$true$o$, false),
  ($i$(]$i$,     $o$false$o$, true),
  ($i$([)]$i$,   $o$false$o$, true),
  ($i${[]}$i$,   $o$true$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'stacks-valid-parentheses' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$4
2 1 2 4$i$, $o$4 2 4 -1$o$, false),
  ($i$3
1 2 3$i$, $o$2 3 -1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'stacks-next-greater-element' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$2 3 4 * +$i$, $o$14$o$, false),
  ($i$5 1 2 + 4 * + 3 -$i$, $o$14$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'stacks-evaluate-postfix' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- QUEUES
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Gas Station Circuit',
  'queues-gas-station',
  'There are n gas stations in a circuit. gas[i] is the fuel available at station i; cost[i] is the fuel needed to travel from station i to station i+1. Starting with an empty tank, find the 0-based starting station index from which you can complete the full circuit once (guaranteed unique if a solution exists, and total gas >= total cost). Output -1 if impossible.',
  'medium',
  (select id from challenge_categories where slug = 'queues'),
  25, 50,
  array['queues', 'greedy'],
  '1 <= n <= 10000',
  'Line 1: n. Line 2: n space-separated gas values. Line 3: n space-separated cost values.',
  'A single integer: the starting index, or -1.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst gas = lines[1].trim().split(' ').map(Number);\nconst cost = lines[2].trim().split(' ').map(Number);\n// TODO: track running tank total and a candidate start index\nconsole.log(-1);\n","python":"n = int(input())\ngas = list(map(int, input().split()))\ncost = list(map(int, input().split()))\n# TODO: track running tank total and a candidate start index\nprint(-1)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Simulate a Queue',
  'queues-simulate-queue',
  'Simulate a FIFO queue given a sequence of operations. Each operation is either "PUSH x" (enqueue x) or "POP" (dequeue and print the value, or print EMPTY if the queue is empty).',
  'easy',
  (select id from challenge_categories where slug = 'queues'),
  15, 20,
  array['queues'],
  '1 <= number of operations <= 10000',
  'Line 1: number of operations m. Next m lines: each "PUSH x" or "POP".',
  'One line of output per POP operation: the dequeued value, or EMPTY.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst m = Number(lines[0]);\nconst queue = [];\nconst out = [];\n// TODO: process each of the next m lines\nconsole.log(out.join('\\n'));\n","python":"import sys\nlines = sys.stdin.read().split('\\n')\nm = int(lines[0])\nqueue = []\nout = []\n# TODO: process each of the next m lines\nprint('\\n'.join(out))\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'First Negative Number in Every Window',
  'queues-first-negative-in-window',
  'Given an array and window size k, output the first negative number in each contiguous window of size k, or 0 if a window has none. (Classic deque/queue problem.)',
  'medium',
  (select id from challenge_categories where slug = 'queues'),
  20, 50,
  array['queues', 'sliding-window'],
  '1 <= k <= n <= 10000',
  'Line 1: n k. Line 2: n space-separated integers.',
  '(n - k + 1) space-separated integers: the first negative in each window (0 if none).',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, k] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: maintain a queue of indices of negative numbers within the window\nconsole.log('');\n","python":"n, k = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: maintain a queue of indices of negative numbers within the window\nprint('')\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$5
1 2 3 4 5
3 4 5 1 2$i$, $o$3$o$, false),
  ($i$3
2 3 4
3 4 3$i$, $o$-1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'queues-gas-station' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$4
PUSH 1
PUSH 2
POP
POP$i$, $o$1
2$o$, false),
  ($i$3
PUSH 5
POP
POP$i$, $o$5
EMPTY$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'queues-simulate-queue' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$5 2
-8 2 3 -6 10$i$, $o$-8 0 -6 -6$o$, false),
  ($i$4 2
1 2 3 4$i$, $o$0 0 0$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'queues-first-negative-in-window' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- BINARY SEARCH
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Binary Search Index',
  'binary-search-index',
  'Given a sorted array and a target, find the 0-based index of the target using binary search, or -1 if not present.',
  'easy',
  (select id from challenge_categories where slug = 'binary-search'),
  10, 20,
  array['binary-search', 'arrays'],
  '1 <= n <= 100000',
  'Line 1: n target. Line 2: n space-separated sorted integers.',
  'A single integer: the index, or -1.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, target] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: classic binary search\nconsole.log(-1);\n","python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: classic binary search\nprint(-1)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Search in Rotated Sorted Array',
  'binary-search-rotated-array',
  'A sorted array of distinct integers was rotated at an unknown pivot. Given the rotated array and a target, find its 0-based index in O(log n), or -1 if absent.',
  'medium',
  (select id from challenge_categories where slug = 'binary-search'),
  25, 50,
  array['binary-search', 'arrays'],
  '1 <= n <= 100000, all elements distinct',
  'Line 1: n target. Line 2: n space-separated integers.',
  'A single integer: the index, or -1.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, target] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: modified binary search that handles the rotation\nconsole.log(-1);\n","python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: modified binary search that handles the rotation\nprint(-1)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Integer Square Root',
  'binary-search-integer-sqrt',
  'Given a non-negative integer x, compute floor(sqrt(x)) using binary search (no built-in sqrt function).',
  'easy',
  (select id from challenge_categories where slug = 'binary-search'),
  10, 20,
  array['binary-search', 'math'],
  '0 <= x <= 2^31 - 1',
  'A single integer: x.',
  'A single integer: floor(sqrt(x)).',
  $sc${"javascript":"const x = Number(require('fs').readFileSync(0, 'utf8').trim());\n// TODO: binary search on the answer from 0 to x\nconsole.log(0);\n","python":"x = int(input())\n# TODO: binary search on the answer from 0 to x\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$6 7
1 3 5 7 9 11$i$, $o$3$o$, false),
  ($i$6 4
1 3 5 7 9 11$i$, $o$-1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'binary-search-index' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$7 0
4 5 6 7 0 1 2$i$, $o$4$o$, false),
  ($i$7 3
4 5 6 7 0 1 2$i$, $o$-1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'binary-search-rotated-array' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$8$i$, $o$2$o$, false),
  ($i$16$i$, $o$4$o$, true),
  ($i$0$i$, $o$0$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'binary-search-integer-sqrt' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- SLIDING WINDOW
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Max Sum Subarray of Size K',
  'sliding-window-max-sum-k',
  'Given an array and window size k, find the maximum sum among all contiguous subarrays of size k.',
  'easy',
  (select id from challenge_categories where slug = 'sliding-window'),
  10, 20,
  array['sliding-window', 'arrays'],
  '1 <= k <= n <= 100000',
  'Line 1: n k. Line 2: n space-separated integers.',
  'A single integer: the maximum window sum.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, k] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: slide a window of size k, tracking the running sum\nconsole.log(0);\n","python":"n, k = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: slide a window of size k, tracking the running sum\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Longest Substring Without Repeating Characters',
  'sliding-window-longest-unique-substring',
  'Given a string, find the length of the longest substring without repeating characters.',
  'medium',
  (select id from challenge_categories where slug = 'sliding-window'),
  20, 50,
  array['sliding-window', 'strings'],
  '0 <= length <= 100000',
  'A single line: the string.',
  'A single integer: the length of the longest substring without repeats.',
  $sc${"javascript":"const s = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: expanding/shrinking window with a set or last-seen-index map\nconsole.log(0);\n","python":"s = input().strip()\n# TODO: expanding/shrinking window with a set or last-seen-index map\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Minimum Size Subarray Sum',
  'sliding-window-min-size-subarray-sum',
  'Given an array of positive integers and a target sum S, find the minimal length of a contiguous subarray whose sum is >= S. Output 0 if no such subarray exists.',
  'medium',
  (select id from challenge_categories where slug = 'sliding-window'),
  20, 50,
  array['sliding-window', 'arrays'],
  '1 <= n <= 100000',
  'Line 1: n S. Line 2: n space-separated positive integers.',
  'A single integer: the minimal subarray length, or 0.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, S] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: variable-size sliding window, shrink while sum >= S\nconsole.log(0);\n","python":"n, S = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: variable-size sliding window, shrink while sum >= S\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$6 3
2 1 5 1 3 2$i$, $o$9$o$, false),
  ($i$4 2
1 1 1 1$i$, $o$2$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'sliding-window-max-sum-k' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$abcabcbb$i$, $o$3$o$, false),
  ($i$bbbbb$i$,   $o$1$o$, true),
  ($i$pwwkew$i$,  $o$3$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'sliding-window-longest-unique-substring' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$6 7
2 3 1 2 4 3$i$, $o$2$o$, false),
  ($i$3 100
1 2 3$i$, $o$0$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'sliding-window-min-size-subarray-sum' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

-- ---------------------------------------------------------------------
-- TWO POINTERS
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Pair With Target Sum',
  'two-pointers-pair-sum',
  'Given a sorted array and a target, find the 0-based indices of the two numbers that add up to target using the two-pointer technique. Exactly one valid pair exists.',
  'easy',
  (select id from challenge_categories where slug = 'two-pointers'),
  15, 20,
  array['two-pointers', 'arrays'],
  '2 <= n <= 100000, array is sorted ascending',
  'Line 1: n target. Line 2: n space-separated sorted integers.',
  'Two space-separated integers: the indices, smaller first.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst [n, target] = lines[0].trim().split(' ').map(Number);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: pointers from both ends, move inward based on the sum\nconsole.log('');\n","python":"n, target = map(int, input().split())\narr = list(map(int, input().split()))\n# TODO: pointers from both ends, move inward based on the sum\nprint('')\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Remove Duplicates Count',
  'two-pointers-remove-duplicates',
  'Given a sorted array (possibly with duplicates), find the count of distinct elements using the two-pointer in-place technique.',
  'easy',
  (select id from challenge_categories where slug = 'two-pointers'),
  10, 20,
  array['two-pointers', 'arrays'],
  '1 <= n <= 100000, array is sorted ascending',
  'Line 1: n. Line 2: n space-separated sorted integers.',
  'A single integer: the count of distinct elements.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst arr = lines[1].trim().split(' ').map(Number);\n// TODO: slow pointer advances only when a new distinct value is seen\nconsole.log(0);\n","python":"n = int(input())\narr = list(map(int, input().split()))\n# TODO: slow pointer advances only when a new distinct value is seen\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, constraints, input_format, output_format, starter_code)
values (
  'Container With Most Water',
  'two-pointers-container-with-most-water',
  'Given n vertical lines where line i has height[i], find two lines that together with the x-axis form a container holding the most water. Output the maximum area.',
  'medium',
  (select id from challenge_categories where slug = 'two-pointers'),
  20, 50,
  array['two-pointers', 'arrays'],
  '2 <= n <= 100000',
  'Line 1: n. Line 2: n space-separated non-negative integers (heights).',
  'A single integer: the maximum area.',
  $sc${"javascript":"const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\nconst n = Number(lines[0]);\nconst h = lines[1].trim().split(' ').map(Number);\n// TODO: two pointers from both ends, move the shorter line inward\nconsole.log(0);\n","python":"n = int(input())\nh = list(map(int, input().split()))\n# TODO: two pointers from both ends, move the shorter line inward\nprint(0)\n"}$sc$::jsonb
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$5 6
1 2 3 4 6$i$, $o$1 3$o$, false),
  ($i$3 6
1 2 3$i$, $o$-1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'two-pointers-pair-sum' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$8
1 1 2 2 2 3 4 4$i$, $o$4$o$, false),
  ($i$3
1 2 3$i$, $o$3$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'two-pointers-remove-duplicates' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select c.id, v.input, v.expected_output, v.is_hidden
from challenges c cross join (values
  ($i$9
1 8 6 2 5 4 8 3 7$i$, $o$49$o$, false),
  ($i$2
1 1$i$, $o$1$o$, true)
) as v(input, expected_output, is_hidden)
where c.slug = 'two-pointers-container-with-most-water' and not exists (select 1 from challenge_test_cases tc where tc.challenge_id = c.id);
