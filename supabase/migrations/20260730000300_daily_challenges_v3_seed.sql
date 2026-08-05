-- =====================================================================
-- Daily Challenges v3 — starter question set for the 15 new categories
-- added in this release (2 each = 30 questions). Original content, not
-- copied from any platform. This is a deliberately modest seed batch —
-- scaling to full coverage is the job of the admin AI question-authoring
-- tool (see admin.challenges.tsx "Generate with AI"), not a one-shot
-- hand-written dump.
--
-- CS/Aptitude questions use question_format='theory': no starter_code or
-- test cases (not executable), the "correct solution" lives in `editorial`
-- (revealed after the user submits their reasoning/answer), consistent
-- with how editorial already works for coding challenges.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Binary Search Trees
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Validate Binary Search Tree',
  'validate-binary-search-tree',
  E'You are given the root of a binary tree. Determine whether it is a valid Binary Search Tree (BST).\n\nA valid BST is defined as follows:\n- The left subtree of a node contains only nodes with values strictly less than the node''s value.\n- The right subtree of a node contains only nodes with values strictly greater than the node''s value.\n- Both the left and right subtrees must also be valid BSTs.\n\nExample 1:\nInput: root = [5,3,8,1,4,7,9]\nOutput: true\n\nExample 2:\nInput: root = [5,3,8,1,9,7,9]\nOutput: false\nExplanation: The right subtree of 5 contains a 1, which is less than 5, and 9 appears twice violating strict ordering.',
  'medium',
  (select id from challenge_categories where slug = 'binary-search-trees'),
  25, 50,
  array['tree','recursion','dfs'], array['Amazon','Microsoft','Adobe'],
  'The number of nodes is in the range [1, 10^4]. Node values are in the range [-2^31, 2^31 - 1].',
  'A level-order array representing the tree (null for missing children).',
  'true or false.',
  '{"javascript": "function isValidBST(root) {\n  // your code here\n}", "python": "def is_valid_bst(root):\n    # your code here\n    pass"}'::jsonb,
  '["A node is valid only relative to a (min, max) range inherited from its ancestors, not just its direct parent.", "Pass the allowed (min, max) bounds down recursively, tightening them at each step.", "An in-order traversal of a valid BST must be strictly increasing — that is an alternative approach."]'::jsonb,
  E'Two common approaches:\n\n1. **Bounded recursion**: carry a (min, max) range down the recursion. At the root, the range is (-∞, +∞). Going left, tighten the max to the parent''s value; going right, tighten the min. A node is valid only if min < node.val < max.\n\n2. **In-order traversal**: an in-order traversal of a valid BST visits values in strictly increasing order. Traverse and check each value is greater than the previous one.\n\nBoth run in O(n) time, O(h) space for the recursion stack (h = tree height).',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, '[5,3,8,1,4,7,9]', 'true', false from challenges where slug = 'validate-binary-search-tree'
union all
select id, '[5,3,8,1,9,7,9]', 'false', false from challenges where slug = 'validate-binary-search-tree'
union all
select id, '[2,1,3]', 'true', true from challenges where slug = 'validate-binary-search-tree'
union all
select id, '[1]', 'true', true from challenges where slug = 'validate-binary-search-tree';

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Kth Smallest Element in a BST',
  'kth-smallest-element-in-a-bst',
  E'Given the root of a Binary Search Tree and an integer k, return the k-th smallest value among all node values in the tree (1-indexed).\n\nExample 1:\nInput: root = [5,3,8,1,4], k = 2\nOutput: 3\n\nExample 2:\nInput: root = [5,3,8,1,4], k = 1\nOutput: 1',
  'easy',
  (select id from challenge_categories where slug = 'binary-search-trees'),
  20, 30,
  array['tree','bst','in-order-traversal'], array['Google','Facebook'],
  '1 <= k <= number of nodes in the tree.',
  'A level-order array representing the tree, and an integer k.',
  'The k-th smallest integer value.',
  '{"javascript": "function kthSmallest(root, k) {\n  // your code here\n}", "python": "def kth_smallest(root, k):\n    # your code here\n    pass"}'::jsonb,
  '["An in-order traversal of a BST visits nodes in sorted order.", "You do not need to build the full sorted list — stop as soon as you have visited k nodes.", "An iterative in-order traversal with an explicit stack lets you stop early without extra recursion overhead."]'::jsonb,
  E'Since an in-order traversal of a BST yields values in ascending order, walk the tree in-order and stop at the k-th visited node. An iterative traversal using an explicit stack is preferred over recursion because it lets you terminate immediately once the counter reaches k, avoiding unnecessary work on the rest of the tree. Time: O(h + k) where h is tree height, space O(h).',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, '[5,3,8,1,4], k=2', '3', false from challenges where slug = 'kth-smallest-element-in-a-bst'
union all
select id, '[5,3,8,1,4], k=1', '1', false from challenges where slug = 'kth-smallest-element-in-a-bst'
union all
select id, '[3,1,4], k=3', '4', true from challenges where slug = 'kth-smallest-element-in-a-bst';

-- ---------------------------------------------------------------------
-- Heaps
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Top K Frequent Elements',
  'top-k-frequent-elements',
  E'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.\n\nExample 1:\nInput: nums = [1,1,1,2,2,3], k = 2\nOutput: [1,2]\n\nExample 2:\nInput: nums = [1], k = 1\nOutput: [1]',
  'medium',
  (select id from challenge_categories where slug = 'heaps'),
  25, 50,
  array['heap','hash-map','sorting'], array['Amazon','Meta','Uber'],
  '1 <= nums.length <= 10^5. k is between 1 and the number of distinct elements. The answer is guaranteed to be unique.',
  'An array of integers nums, and an integer k.',
  'An array of the k most frequent integers.',
  '{"javascript": "function topKFrequent(nums, k) {\n  // your code here\n}", "python": "def top_k_frequent(nums, k):\n    # your code here\n    pass"}'::jsonb,
  '["First count the frequency of every element with a hash map.", "You don''t need to fully sort all distinct elements by frequency — a min-heap of size k is enough to track the top k.", "Bucket sort by frequency (index = frequency, value = list of elements) gives an O(n) alternative to heaps."]'::jsonb,
  E'Two solid approaches:\n\n1. **Min-heap of size k**: count frequencies with a hash map, then push (frequency, value) pairs into a min-heap, popping whenever the heap exceeds size k. What remains are the k most frequent elements. O(n log k) time.\n\n2. **Bucket sort**: since frequency is bounded by n, create buckets indexed by frequency (0..n), append each element to bucket[frequency], then walk buckets from highest to lowest collecting elements until you have k. O(n) time, O(n) space — asymptotically better when k is close to n.',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, 'nums=[1,1,1,2,2,3], k=2', '[1,2]', false from challenges where slug = 'top-k-frequent-elements'
union all
select id, 'nums=[1], k=1', '[1]', false from challenges where slug = 'top-k-frequent-elements'
union all
select id, 'nums=[4,4,4,6,6,7,7,7,7], k=1', '[7]', true from challenges where slug = 'top-k-frequent-elements';

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Find the Median from a Data Stream',
  'find-median-from-data-stream',
  E'Design a data structure that supports adding integers from a stream one at a time and, at any point, returning the median of all elements seen so far.\n\nImplement a structure with:\n- addNum(num): adds an integer to the running stream.\n- findMedian(): returns the median of all elements added so far.\n\nExample:\naddNum(1); addNum(2); findMedian() -> 1.5\naddNum(3); findMedian() -> 2.0',
  'hard',
  (select id from challenge_categories where slug = 'heaps'),
  35, 100,
  array['heap','two-heaps','design'], array['Google','Amazon'],
  'At most 5 * 10^4 calls will be made to addNum and findMedian combined. -10^5 <= num <= 10^5.',
  'A sequence of addNum and findMedian operations.',
  'For each findMedian call, the current median as a floating-point value.',
  '{"javascript": "class MedianFinder {\n  constructor() {\n    // your code here\n  }\n  addNum(num) {\n    // your code here\n  }\n  findMedian() {\n    // your code here\n  }\n}", "python": "class MedianFinder:\n    def __init__(self):\n        pass\n\n    def add_num(self, num):\n        pass\n\n    def find_median(self):\n        pass"}'::jsonb,
  '["A single sorted list works but insertion is O(n) per call — you can do better.", "Maintain two heaps: a max-heap for the smaller half of the numbers and a min-heap for the larger half.", "Keep the heaps balanced in size (differ by at most 1) after every insertion; the median is then derivable from the heap tops in O(1)."]'::jsonb,
  E'Maintain two heaps: a max-heap `lower` holding the smaller half of the numbers seen so far, and a min-heap `upper` holding the larger half, kept balanced so their sizes differ by at most 1.\n\nOn addNum: push into one heap, then rebalance by moving the top of one heap into the other if sizes become uneven.\n\nOn findMedian: if the heaps are equal size, the median is the average of both tops; otherwise it is the top of the larger heap.\n\nEach addNum is O(log n); findMedian is O(1).',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, 'addNum(1), addNum(2), findMedian()', '1.5', false from challenges where slug = 'find-median-from-data-stream'
union all
select id, 'addNum(1), addNum(2), addNum(3), findMedian()', '2.0', true from challenges where slug = 'find-median-from-data-stream';

-- ---------------------------------------------------------------------
-- Bit Manipulation
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Find the Unpaired Element',
  'find-the-unpaired-element',
  E'You are given a non-empty array of integers where every element appears exactly twice, except for one element which appears only once. Find that single element.\n\nYour solution must run in O(n) time and use O(1) extra space.\n\nExample 1:\nInput: nums = [4,1,2,1,2]\nOutput: 4\n\nExample 2:\nInput: nums = [2,2,1]\nOutput: 1',
  'easy',
  (select id from challenge_categories where slug = 'bit-manipulation'),
  15, 30,
  array['bit-manipulation','xor'], array['Amazon','Adobe'],
  '1 <= nums.length <= 3*10^4. Exactly one element appears once; all others appear exactly twice.',
  'An array of integers nums.',
  'The single integer that appears once.',
  '{"javascript": "function singleNumber(nums) {\n  // your code here\n}", "python": "def single_number(nums):\n    # your code here\n    pass"}'::jsonb,
  '["A hash map counting occurrences works but uses O(n) space — the O(1)-space constraint rules it out.", "XOR of a number with itself is 0, and XOR is commutative/associative.", "XOR all the numbers together — every paired value cancels out, leaving only the unpaired one."]'::jsonb,
  E'XOR every element together. Since `x ^ x = 0` and `x ^ 0 = x`, and XOR is commutative and associative, every value that appears twice cancels itself out regardless of order, leaving only the value that appears once. Single pass, O(n) time, O(1) space.',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, '[4,1,2,1,2]', '4', false from challenges where slug = 'find-the-unpaired-element'
union all
select id, '[2,2,1]', '1', false from challenges where slug = 'find-the-unpaired-element'
union all
select id, '[1]', '1', true from challenges where slug = 'find-the-unpaired-element';

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Count Set Bits',
  'count-set-bits',
  E'Given a non-negative integer n, return the number of 1 bits in its binary representation (also known as the Hamming weight).\n\nExample 1:\nInput: n = 11 (binary: 1011)\nOutput: 3\n\nExample 2:\nInput: n = 128 (binary: 10000000)\nOutput: 1',
  'easy',
  (select id from challenge_categories where slug = 'bit-manipulation'),
  10, 20,
  array['bit-manipulation'], array['Microsoft','Apple'],
  '0 <= n <= 2^31 - 1.',
  'A non-negative integer n.',
  'The count of 1 bits in its binary representation.',
  '{"javascript": "function hammingWeight(n) {\n  // your code here\n}", "python": "def hamming_weight(n):\n    # your code here\n    pass"}'::jsonb,
  '["The naive approach checks all 32 bits one at a time with a shift and mask.", "Brian Kernighan''s trick: n & (n - 1) clears the lowest set bit — count how many times you can do that before n becomes 0.", "This runs in O(number of set bits) rather than O(32), which is faster for sparse numbers."]'::jsonb,
  E'Brian Kernighan''s algorithm: repeatedly apply `n = n & (n - 1)`, which clears the lowest set bit of n, and count iterations until n becomes 0. This runs in O(k) where k is the number of set bits, versus the naive O(32) bit-by-bit scan.',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, '11', '3', false from challenges where slug = 'count-set-bits'
union all
select id, '128', '1', false from challenges where slug = 'count-set-bits'
union all
select id, '0', '0', true from challenges where slug = 'count-set-bits';

-- ---------------------------------------------------------------------
-- C
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Reverse a String In-Place (C)',
  'reverse-a-string-in-place-c',
  E'Write a C function that reverses a null-terminated string in place (no extra buffer allocation).\n\nvoid reverse_string(char *s);\n\nExample:\nInput: "hello"\nOutput: "olleh"',
  'easy',
  (select id from challenge_categories where slug = 'c'),
  15, 20,
  array['c','strings','pointers'], array['Qualcomm','Intel'],
  'The string length is between 0 and 10^4. Must not allocate a second buffer.',
  'A null-terminated char* string.',
  'The same string, reversed in place.',
  '{"c": "#include <string.h>\n\nvoid reverse_string(char *s) {\n    // your code here\n}"}'::jsonb,
  '["Use two index pointers, one starting at the beginning and one at the end.", "Swap the characters at the two pointers and move them toward each other until they meet or cross.", "Remember to stop at strlen(s) - 1, not strlen(s), since the last valid character index is length - 1 (excluding the null terminator)."]'::jsonb,
  E'Use two pointers/indices, `left` at 0 and `right` at `strlen(s) - 1`. Swap `s[left]` and `s[right]`, then increment `left` and decrement `right`, stopping when `left >= right`. This is O(n) time, O(1) extra space — no second buffer needed.',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, '"hello"', '"olleh"', false from challenges where slug = 'reverse-a-string-in-place-c'
union all
select id, '""', '""', true from challenges where slug = 'reverse-a-string-in-place-c'
union all
select id, '"a"', '"a"', true from challenges where slug = 'reverse-a-string-in-place-c';

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Implement a Growable Integer Array (C)',
  'implement-a-growable-integer-array-c',
  E'Implement a minimal growable integer array (like a tiny std::vector<int>) in C using malloc/realloc:\n\ntypedef struct {\n    int *data;\n    int size;\n    int capacity;\n} IntVector;\n\nvoid iv_init(IntVector *v);\nvoid iv_push(IntVector *v, int value);\nvoid iv_free(IntVector *v);\n\niv_push should automatically grow the backing array (e.g. doubling capacity) when it is full, and iv_free must release all allocated memory with no leaks.',
  'medium',
  (select id from challenge_categories where slug = 'c'),
  30, 50,
  array['c','memory-management','data-structures'], array['Qualcomm','NVIDIA'],
  'Must not leak memory (verified with valgrind-style checks). capacity should grow by doubling, not by a fixed increment, to keep amortized push O(1).',
  'A sequence of iv_push calls with integer values.',
  'The final contents of the array after all pushes.',
  '{"c": "#include <stdlib.h>\n\ntypedef struct {\n    int *data;\n    int size;\n    int capacity;\n} IntVector;\n\nvoid iv_init(IntVector *v) {\n    // your code here\n}\n\nvoid iv_push(IntVector *v, int value) {\n    // your code here\n}\n\nvoid iv_free(IntVector *v) {\n    // your code here\n}"}'::jsonb,
  '["Start with a small initial capacity (e.g. 4) allocated in iv_init.", "In iv_push, if size == capacity, reallocate with realloc(v->data, sizeof(int) * new_capacity) before writing the new value.", "Doubling capacity each time it fills gives amortized O(1) push cost — always free v->data in iv_free, not the struct itself (the caller owns that)."]'::jsonb,
  E'`iv_init` allocates an initial small buffer (e.g. capacity 4) with malloc and sets size to 0. `iv_push` checks if `size == capacity`; if so, it doubles capacity and calls `realloc` (checking for a null return in production code) before writing `value` at `data[size++]`. Doubling amortizes the cost of resizing to O(1) per push on average, since resizes become exponentially rarer. `iv_free` calls `free(v->data)` and resets size/capacity to 0 to avoid dangling-pointer reuse.',
  'coding'
) on conflict (slug) do nothing;

insert into challenge_test_cases (challenge_id, input, expected_output, is_hidden)
select id, 'push(1), push(2), push(3)', '[1,2,3]', false from challenges where slug = 'implement-a-growable-integer-array-c'
union all
select id, 'push x10 sequential ints', '[0,1,2,3,4,5,6,7,8,9]', true from challenges where slug = 'implement-a-growable-integer-array-c';

-- ---------------------------------------------------------------------
-- HTML
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Build an Accessible Signup Form',
  'build-an-accessible-signup-form',
  E'Write the HTML for a signup form with fields for Name, Email, and Password, plus a Submit button.\n\nRequirements:\n- Every input must have an associated <label> (via `for`/`id`, not just placeholder text).\n- The email field must use type="email" and the password field type="password".\n- The form must have a name attribute and use method="post".\n- All required fields must have the `required` attribute.',
  'easy',
  (select id from challenge_categories where slug = 'html'),
  15, 20,
  array['html','forms','accessibility'], array['Deloitte','Infosys'],
  'Must be valid, semantic HTML5. No JavaScript required.',
  'N/A — this is a markup-authoring task.',
  'The HTML markup for the form.',
  '{"html": "<form name=\"signup\" method=\"post\">\n  <!-- your markup here -->\n</form>"}'::jsonb,
  '["<label for=\"id\"> paired with <input id=\"id\"> is what actually makes a form accessible — placeholder text alone is not a substitute.", "Use the right input type for each field so browsers apply the correct keyboard/validation (type=\"email\", type=\"password\").", "Don''t forget the required attribute on fields that must be filled in."]'::jsonb,
  E'A correct answer explicitly pairs each `<label for="...">` with its `<input id="...">` (screen readers rely on this association, not on placeholder text), uses `type="email"` and `type="password"` for the relevant fields so browsers apply correct validation/keyboards, and marks required fields with the `required` attribute. Example:\n\n```html\n<form name="signup" method="post">\n  <label for="name">Name</label>\n  <input id="name" name="name" type="text" required>\n\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email" required>\n\n  <label for="password">Password</label>\n  <input id="password" name="password" type="password" required>\n\n  <button type="submit">Sign up</button>\n</form>\n```',
  'coding'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Fix the Invalid Nested Markup',
  'fix-the-invalid-nested-markup',
  E'The following HTML has several structural validity issues. Rewrite it so it is valid HTML5:\n\n```html\n<p>This is a paragraph with a <div>block inside it</div>.</p>\n<ul>\n  <li>Item one\n  <li>Item two</li>\n</ul>\n<a href="#"><button>Click me</button></a>\n```\n\nIdentify and fix all three problems: a block-level element nested inside an inline-content-only element, an unclosed list item, and an interactive element nested inside another interactive element.',
  'easy',
  (select id from challenge_categories where slug = 'html'),
  15, 20,
  array['html','validation'], array['TCS','Wipro'],
  'The fixed markup must be valid per the HTML5 spec and preserve the original intent as closely as possible.',
  'A snippet of invalid HTML.',
  'The corrected, valid HTML markup.',
  '{"html": "<!-- paste and fix the snippet here -->"}'::jsonb,
  '["<p> elements cannot contain block-level content like <div> — use a <span> or restructure.", "Every <li> should be explicitly closed with </li>, even though browsers tolerate omitting it.", "Interactive elements (like <button>) cannot be nested inside other interactive elements (like <a>) — pick one or use CSS to style a single element to look like both."]'::jsonb,
  E'Corrected version:\n\n```html\n<p>This is a paragraph with a <span>span inside it</span>.</p>\n<ul>\n  <li>Item one</li>\n  <li>Item two</li>\n</ul>\n<a href="#" role="button" class="btn-like-link">Click me</a>\n```\n\nThree fixes: (1) `<div>` is block-level and cannot legally sit inside a `<p>` (which only permits phrasing/inline content) — replaced with `<span>`; (2) explicitly closed every `<li>`; (3) removed the nested `<button>` inside `<a>` (interactive-in-interactive is invalid) and instead styled the anchor itself to look like a button.',
  'coding'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- CSS
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Center a Div Three Ways',
  'center-a-div-three-ways',
  E'Given a fixed-size 200x200px div inside a full-viewport-height container, write CSS to center it both horizontally and vertically. Provide your solution using Flexbox.\n\n(In your written explanation/hints usage, also note how you would achieve the same result with CSS Grid and with absolute positioning — only the Flexbox code is graded here.)',
  'easy',
  (select id from challenge_categories where slug = 'css'),
  10, 20,
  array['css','flexbox','layout'], array['Zoho','Freshworks'],
  'The box must remain centered when the viewport is resized.',
  'A container div and a fixed-size child div.',
  'CSS rules that center the child both horizontally and vertically.',
  '{"css": ".container {\n  height: 100vh;\n  /* your code here */\n}\n\n.box {\n  width: 200px;\n  height: 200px;\n}"}'::jsonb,
  '["display: flex on the container is the starting point.", "justify-content controls the main (horizontal, by default) axis; align-items controls the cross axis.", "Setting both justify-content: center and align-items: center centers on both axes at once."]'::jsonb,
  E'Flexbox solution:\n\n```css\n.container {\n  height: 100vh;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n```\n\nAlternatives worth knowing: **CSS Grid** — `display: grid; place-items: center;` on the container is even more concise. **Absolute positioning** — `.box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }` with `.container { position: relative; }`, useful when you can''t make the container a flex/grid context.',
  'coding'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Build a Responsive Card Grid',
  'build-a-responsive-card-grid',
  E'Write CSS so that a container of an unknown number of `.card` children lays them out in a responsive grid: as many columns as fit at a minimum card width of 240px, wrapping to new rows as needed, with a consistent 16px gap in every direction — no media queries allowed.',
  'medium',
  (select id from challenge_categories where slug = 'css'),
  20, 50,
  array['css','grid','responsive-design'], array['Flipkart','Swiggy'],
  'Must not use @media queries. Must work correctly for any number of cards (0 to hundreds).',
  'A container div with class "grid" containing an arbitrary number of ".card" children.',
  'CSS rules producing the described responsive grid.',
  '{"css": ".grid {\n  display: grid;\n  /* your code here */\n}"}'::jsonb,
  '["CSS Grid''s repeat() function combined with auto-fill or auto-fit can create a media-query-free responsive grid.", "minmax(240px, 1fr) lets each column grow to fill available space but never shrink below 240px.", "auto-fit collapses empty tracks when there are fewer cards than would fill a row; auto-fill leaves them as empty tracks — auto-fit is usually what you want here."]'::jsonb,
  E'```css\n.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 16px;\n}\n```\n\n`repeat(auto-fit, minmax(240px, 1fr))` tells the browser to fit as many 240px-minimum columns as will fit in the container width, then stretch them evenly (`1fr`) to fill any remaining space — all without a single media query. `auto-fit` (versus `auto-fill`) collapses unused empty tracks when there aren''t enough cards to fill a row, so a single card doesn''t get stranded next to a bunch of empty ghost columns.',
  'coding'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Authentication
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Implement JWT Middleware Validation',
  'implement-jwt-middleware-validation',
  E'Write an Express-style middleware function `requireAuth(req, res, next)` that:\n\n1. Reads a bearer token from the `Authorization` header (format: `Bearer <token>`).\n2. Returns 401 if the header is missing or malformed.\n3. Verifies the token using a provided `verifyToken(token)` function (assume it throws on an invalid/expired token and otherwise returns a decoded payload `{ userId, exp }`).\n4. Returns 401 if verification fails.\n5. On success, attaches `req.user = { id: decoded.userId }` and calls next().\n\nYou do not need to implement verifyToken itself — assume it is provided.',
  'medium',
  (select id from challenge_categories where slug = 'authentication'),
  25, 50,
  array['authentication','jwt','middleware','security'], array['Razorpay','PayPal','Stripe'],
  'Must not leak whether the failure was "missing header" vs "invalid token" in the response body (both should look like a generic 401 to avoid information leakage to attackers).',
  'An Express-style request object with headers, and a verifyToken function.',
  'The middleware either calls next() with req.user set, or responds with a 401 status.',
  '{"javascript": "function requireAuth(verifyToken) {\n  return function (req, res, next) {\n    // your code here\n  };\n}"}'::jsonb,
  '["Split the Authorization header on the space between \"Bearer\" and the token, and validate the format before trying to verify anything.", "Wrap verifyToken in a try/catch — a thrown error means an invalid or expired token, not a bug in your middleware.", "Keep the 401 response identical (same message, no stack traces) whether the header was missing or the token was invalid — don''t give attackers a way to distinguish \"no token\" from \"wrong token\"."]'::jsonb,
  E'```javascript\nfunction requireAuth(verifyToken) {\n  return function (req, res, next) {\n    const header = req.headers["authorization"];\n    if (!header || !header.startsWith("Bearer ")) {\n      return res.status(401).json({ error: "Unauthorized" });\n    }\n    const token = header.slice(7);\n    try {\n      const decoded = verifyToken(token);\n      req.user = { id: decoded.userId };\n      next();\n    } catch {\n      return res.status(401).json({ error: "Unauthorized" });\n    }\n  };\n}\n```\n\nKey points: validate header *shape* before attempting verification (cheap, avoids unnecessary crypto work on obviously malformed requests); wrap verification in try/catch since a expired/tampered JWT throws rather than returning null; and crucially return the exact same generic error for every failure mode so the response never tells an attacker whether they guessed a real user''s token format correctly.',
  'coding'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Hash and Verify Passwords Correctly',
  'hash-and-verify-passwords-correctly',
  E'Implement two functions using a provided bcrypt-like library with `hash(password, saltRounds)` and `compare(password, hash)`:\n\n1. `registerPassword(plainPassword)`: returns a hash suitable for storage. Never store the plaintext password.\n2. `verifyPassword(plainPassword, storedHash)`: returns true if plainPassword matches storedHash, false otherwise, without throwing on malformed input.\n\nExplain in a comment why storing a plain SHA-256 hash of the password (with no salt or work factor) would be insecure even though SHA-256 itself is a strong hash function.',
  'easy',
  (select id from challenge_categories where slug = 'authentication'),
  15, 30,
  array['authentication','password-hashing','security'], array['Paytm','Zoho'],
  'saltRounds should be a reasonable production value (10-12), not 1 (too fast, brute-forceable) or 20+ (too slow for login latency).',
  'A plaintext password string, and for verification, a plaintext password plus a stored hash.',
  'A hash for registration; a boolean for verification.',
  '{"javascript": "function registerPassword(plainPassword, bcryptLike) {\n  // your code here\n}\n\nfunction verifyPassword(plainPassword, storedHash, bcryptLike) {\n  // your code here\n}"}'::jsonb,
  '["Use a work-factor-based hashing scheme (bcrypt/scrypt/argon2 style), not a fast general-purpose hash like plain SHA-256 or MD5.", "The salt is generated and stored automatically as part of the hash output in bcrypt-style libraries — you don''t need to manage it separately.", "compare() should be used for verification instead of re-hashing and doing a string equality check yourself, since timing-safe comparison matters."]'::jsonb,
  E'```javascript\nfunction registerPassword(plainPassword, bcryptLike) {\n  return bcryptLike.hash(plainPassword, 12);\n}\n\nfunction verifyPassword(plainPassword, storedHash, bcryptLike) {\n  try {\n    return bcryptLike.compare(plainPassword, storedHash);\n  } catch {\n    return false;\n  }\n}\n```\n\nWhy plain SHA-256 is insecure for passwords despite being cryptographically strong: SHA-256 is designed to be *fast* (that''s desirable for checksums, not passwords). A GPU/ASIC can compute billions of SHA-256 hashes per second, making brute-force and rainbow-table attacks on stolen hash dumps feasible — especially for short/common passwords. bcrypt/scrypt/argon2 are deliberately *slow* and tunable (via a work factor / cost parameter) so that even leaked hashes remain expensive to crack at scale, and they embed a random salt automatically so identical passwords don''t produce identical hashes.',
  'coding'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- MongoDB
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Aggregation Pipeline: Top Spending Customers',
  'aggregation-pipeline-top-spending-customers',
  E'Given a MongoDB `orders` collection where each document looks like:\n\n```json\n{ "customerId": "c1", "amount": 149.99, "status": "completed", "createdAt": ISODate("...") }\n```\n\nWrite an aggregation pipeline that returns the top 5 customers by total spend, counting only orders with status "completed", as documents shaped `{ customerId, totalSpent }`, sorted descending by totalSpent.',
  'medium',
  (select id from challenge_categories where slug = 'mongodb'),
  20, 50,
  array['mongodb','aggregation','database'], array['MongoDB','Zomato'],
  'Must use the aggregation pipeline (not client-side JS post-processing). Assume the orders collection can be large (millions of documents) so filter as early as possible in the pipeline.',
  'A MongoDB collection "orders".',
  'An aggregation pipeline (array of stages).',
  '{"javascript": "const pipeline = [\n  // your stages here\n];"}'::jsonb,
  '["Filter with $match on status as the very first stage — doing it early lets Mongo use an index and avoids grouping documents you''ll immediately discard.", "$group by customerId, using $sum on amount to accumulate totalSpent.", "$sort descending by totalSpent, then $limit to 5, in that order."]'::jsonb,
  E'```javascript\nconst pipeline = [\n  { $match: { status: "completed" } },\n  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },\n  { $project: { _id: 0, customerId: "$_id", totalSpent: 1 } },\n  { $sort: { totalSpent: -1 } },\n  { $limit: 5 }\n];\n```\n\n`$match` first lets MongoDB use an index on `status` (or a compound index including it) and discard non-completed orders before the expensive `$group` stage has to touch them — pushing filters as early as possible in a pipeline is the single most impactful aggregation optimization. `$group` with `$sum` accumulates each customer''s total in one pass. `$project` reshapes `_id` back into `customerId` for a cleaner output shape. `$sort` + `$limit` (in that order) gives the top 5.',
  'coding'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, constraints, input_format, output_format, starter_code, hints, editorial, question_format)
values (
  'Design a Mongoose Schema for a Blog Platform',
  'design-a-mongoose-schema-for-a-blog-platform',
  E'Design Mongoose schemas for a simple blog platform with `Post` and `Comment` collections:\n\n- A Post has: title (required, max 200 chars), body (required), authorId (reference to a User), tags (array of strings), publishedAt (date, optional — null means draft), and timestamps.\n- A Comment has: postId (reference to Post, required), authorId (reference to a User, required), text (required, max 1000 chars), and timestamps.\n- Comments should be efficiently queryable by postId (add the appropriate index).',
  'easy',
  (select id from challenge_categories where slug = 'mongodb'),
  20, 30,
  array['mongodb','mongoose','schema-design'], array['MongoDB','Practo'],
  'Use Mongoose schema syntax. Validation constraints (required, maxlength) must be enforced at the schema level, not just documented in comments.',
  'N/A — this is a schema-design task.',
  'Two Mongoose schema/model definitions: Post and Comment.',
  '{"javascript": "const mongoose = require(\"mongoose\");\nconst { Schema } = mongoose;\n\n// your schemas here\n"}'::jsonb,
  '["Use ref: \"User\" on ObjectId fields that point to another collection, so you can .populate() them later.", "{ timestamps: true } in the schema options automatically adds and manages createdAt/updatedAt — no need to declare them by hand.", "index({ postId: 1 }) on the Comment schema makes \"all comments for a post\" queries efficient as the collection grows."]'::jsonb,
  E'```javascript\nconst postSchema = new Schema({\n  title: { type: String, required: true, maxlength: 200 },\n  body: { type: String, required: true },\n  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },\n  tags: [{ type: String }],\n  publishedAt: { type: Date, default: null },\n}, { timestamps: true });\n\nconst commentSchema = new Schema({\n  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },\n  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },\n  text: { type: String, required: true, maxlength: 1000 },\n}, { timestamps: true });\n\nmodule.exports = {\n  Post: mongoose.model("Post", postSchema),\n  Comment: mongoose.model("Comment", commentSchema),\n};\n```\n\n`ref` fields enable `.populate()` for joining author/post data at query time. `{ timestamps: true }` avoids manually managing createdAt/updatedAt. The `index: true` on `commentSchema.postId` is what makes "fetch all comments for this post" fast instead of a full collection scan as data grows.',
  'coding'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Operating Systems (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Process vs Thread',
  'process-vs-thread',
  E'Explain the difference between a process and a thread. Your answer should cover:\n\n1. Memory: what is shared and what is isolated between (a) two threads of the same process, and (b) two separate processes.\n2. Cost: why creating a new thread is generally cheaper than creating a new process (context switching and creation overhead).\n3. Failure isolation: why a crash in one process typically does not take down another process, but a crash in one thread can take down the whole process.\n\nWrite your answer in the code area as plain text/comments.',
  'easy',
  (select id from challenge_categories where slug = 'operating-systems'),
  15, 20,
  array['operating-systems','processes','threads'], array['Amazon','Microsoft','Oracle'],
  '["Threads within the same process share the same address space (heap, global/static memory, open file descriptors); processes each get their own isolated address space.", "Each thread does get its own stack and register set/program counter — that''s what makes it independently schedulable.", "Because threads share memory directly, an unhandled exception or memory corruption in one thread can corrupt shared state or crash the entire process; a process crash is contained by the OS-enforced memory isolation between processes."]'::jsonb,
  E'**Memory**: Threads of the same process share the process''s address space — heap, global/static variables, open file descriptors, and code segment — but each thread has its own stack, register set, and program counter. Separate processes each get a completely isolated virtual address space enforced by the OS/MMU; they cannot directly read/write each other''s memory (they need IPC — pipes, shared memory segments, sockets — to communicate).\n\n**Cost**: Creating a thread is cheaper than creating a process because it reuses the existing process''s address space, open files, and other resources — the OS only has to allocate a new stack and scheduling context, not duplicate/re-map an entire address space. Context switches between threads of the same process are also cheaper than between processes, since the MMU/TLB and address-space mappings don''t need to be flushed and reloaded.\n\n**Failure isolation**: Because processes are memory-isolated by the OS, a segfault or unhandled exception in one process is contained to that process — the OS simply terminates it, and other processes are unaffected. Threads share memory directly, so memory corruption, an unhandled exception, or a crash in one thread can corrupt shared heap state or bring down the entire process, taking every other thread in it down as well.',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'The Four Necessary Conditions for Deadlock',
  'the-four-necessary-conditions-for-deadlock',
  E'A deadlock occurs when a set of processes are each waiting for a resource held by another process in the set, and none can proceed. List and briefly explain the four necessary conditions (Coffman conditions) that must all hold simultaneously for a deadlock to be possible, and give one practical strategy for preventing deadlock by breaking one of those conditions.',
  'medium',
  (select id from challenge_categories where slug = 'operating-systems'),
  20, 50,
  array['operating-systems','deadlock','concurrency'], array['Microsoft','Cisco'],
  '["The four conditions are: mutual exclusion, hold and wait, no preemption, and circular wait.", "You only need to break ONE of the four conditions to make deadlock impossible — you don''t need to break all four.", "A classic prevention strategy: impose a global ordering on resource acquisition (e.g. always acquire lock A before lock B, never the reverse) — this breaks the circular wait condition."]'::jsonb,
  E'The four Coffman conditions, all of which must hold simultaneously for deadlock to be possible:\n\n1. **Mutual exclusion**: at least one resource must be held in a non-shareable mode (only one process can use it at a time).\n2. **Hold and wait**: a process holding at least one resource is waiting to acquire additional resources currently held by other processes.\n3. **No preemption**: resources cannot be forcibly taken away from a process; they can only be released voluntarily.\n4. **Circular wait**: a cycle of two or more processes exists, each waiting for a resource held by the next process in the cycle.\n\nBreaking any single condition prevents deadlock. The most common practical strategy is breaking **circular wait** by imposing a total/global ordering on resource acquisition — e.g. if every part of the system always acquires lock A before lock B (never B before A), a circular wait can never form, since a cycle would require some path that acquires them out of order.',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- DBMS (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Normal Forms: 1NF, 2NF, 3NF',
  'normal-forms-1nf-2nf-3nf',
  E'Given this un-normalized table:\n\nOrders(order_id, customer_name, customer_email, product_id, product_name, quantity)\n\nWhere a single order can include only one product (one row per order-product), but customer_email determines customer_name, and product_id determines product_name.\n\nExplain what normal form this table violates and walk through normalizing it to 3NF, showing the resulting tables and their keys.',
  'medium',
  (select id from challenge_categories where slug = 'dbms'),
  25, 50,
  array['dbms','normalization','database-design'], array['TCS','Capgemini','Oracle'],
  '["1NF requires atomic values and no repeating groups — check whether every column here already holds a single atomic value.", "2NF requires no partial dependency on part of a composite key — relevant only if the primary key is composite.", "3NF requires no transitive dependency: a non-key column should not depend on another non-key column (here, product_name depends on product_id, not directly on order_id)."]'::jsonb,
  E'The table is already in 1NF (every column holds a single atomic value, no repeating groups). It violates **3NF** due to transitive dependencies: `customer_name` depends on `customer_email` (not directly on `order_id`), and `product_name` depends on `product_id` (not directly on `order_id`) — non-key attributes depending on other non-key attributes rather than solely on the primary key.\n\nNormalized to 3NF:\n\n```\nOrders(order_id PK, customer_email FK, product_id FK, quantity)\nCustomers(customer_email PK, customer_name)\nProducts(product_id PK, product_name)\n```\n\nEach table''s non-key columns now depend only on that table''s primary key, eliminating redundancy (e.g. a customer''s name is stored once, not repeated on every order row) and the update anomalies that come with it (previously, changing a customer''s name would require updating every order row for that customer).',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'ACID Properties in Transactions',
  'acid-properties-in-transactions',
  E'Explain each of the four ACID properties (Atomicity, Consistency, Isolation, Durability) that a database transaction guarantees, and give a concrete example of what could go wrong (a real bug/bad outcome) if each property individually were NOT guaranteed, using a bank transfer (debit account A, credit account B) as your running example.',
  'easy',
  (select id from challenge_categories where slug = 'dbms'),
  20, 30,
  array['dbms','transactions','acid'], array['Infosys','HSBC','Oracle'],
  '["Atomicity is about all-or-nothing: think about what happens if the debit succeeds but the credit fails partway through.", "Consistency is about the database moving between valid states according to its constraints/rules (e.g. total money in the system should not change).", "Isolation is about concurrent transactions not seeing each other''s partial/uncommitted work; Durability is about committed data surviving a crash right after commit."]'::jsonb,
  E'**Atomicity**: the transaction happens completely or not at all. Without it: the debit from account A could succeed but the credit to account B could fail (e.g. a crash mid-transaction) — money vanishes.\n\n**Consistency**: the transaction moves the database from one valid state to another, respecting all constraints (e.g. total balance across the system stays the same). Without it: a bug could let the transfer complete in a way that violates a constraint, e.g. crediting B without actually debiting A, creating money out of nowhere.\n\n**Isolation**: concurrent transactions don''t see each other''s uncommitted intermediate state. Without it: a concurrent balance-check transaction reading account A mid-transfer could see the debited-but-not-yet-credited state (a "dirty read"), reporting an incorrect balance that doesn''t reflect either the before or after state.\n\n**Durability**: once a transaction commits, its effects survive even a crash immediately afterward. Without it: the transfer could report success to the user, then a server crash right after could lose the write before it reached durable storage, silently reverting the transfer despite the user having been told it succeeded.',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- OOP (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'The Four Pillars of OOP',
  'the-four-pillars-of-oop',
  E'Name and explain the four core principles of object-oriented programming (encapsulation, abstraction, inheritance, polymorphism). For each one, give a short, concrete code-shaped example (pseudocode is fine) illustrating it.',
  'easy',
  (select id from challenge_categories where slug = 'oop'),
  20, 30,
  array['oop','fundamentals'], array['TCS','Infosys','Accenture'],
  '["Encapsulation is about bundling data with the methods that operate on it and restricting direct access to internal state (private fields + public getters/setters).", "Abstraction is about exposing only what''s necessary and hiding implementation details behind a simpler interface.", "Polymorphism has two common flavors worth mentioning: compile-time (method overloading) and runtime (method overriding via inheritance/interfaces)."]'::jsonb,
  E'**Encapsulation**: bundling data and the methods that operate on it together, and restricting direct external access to internal state. Example: a `BankAccount` class with a private `balance` field, exposed only through `deposit()`/`withdraw()` methods that enforce invariants (e.g. balance can''t go negative) — external code cannot set `balance` directly.\n\n**Abstraction**: exposing only the essential interface and hiding implementation complexity. Example: a `Shape` interface with a `getArea()` method — callers just call `shape.getArea()` without needing to know whether it''s a `Circle` or `Rectangle` underneath, or how each computes its area.\n\n**Inheritance**: a class acquiring properties/behavior from a parent class, enabling code reuse and an "is-a" relationship. Example: `class Dog extends Animal` inherits `eat()`/`sleep()` from `Animal` and adds its own `bark()`.\n\n**Polymorphism**: the same interface/method call behaving differently depending on the actual object type. Example (runtime/override): calling `shape.getArea()` on a list of mixed `Circle` and `Rectangle` objects invokes each subclass''s own implementation through the same `Shape` interface. (Compile-time/overload: a `add(int, int)` and `add(double, double)` pair resolved at compile time based on argument types.)',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Composition vs Inheritance',
  'composition-vs-inheritance',
  E'"Favor composition over inheritance" is common OOP design advice. Explain what this means, describe one concrete problem that deep inheritance hierarchies tend to cause, and rewrite this inheritance-based design as a composition-based one:\n\n```\nclass FlyingCar extends Car, Airplane { ... }\n```\n(illustrating the classic problem this specific example runs into, and how composition avoids it).',
  'medium',
  (select id from challenge_categories where slug = 'oop'),
  20, 50,
  array['oop','design-principles','composition'], array['Amazon','Google'],
  '["Multiple inheritance (extending two classes) causes the \"diamond problem\" — ambiguity when both parent classes define a method with the same name/signature.", "Composition means a class HAS-A instance of another class as a field/collaborator, rather than IS-A via inheritance.", "With composition, you can mix and match behaviors (e.g. a Drivable behavior and a Flyable behavior) without needing multiple inheritance or a rigid single-parent hierarchy."]'::jsonb,
  E'"Favor composition over inheritance" means preferring to build behavior by having a class hold references to other objects that implement that behavior (HAS-A), rather than by extending a parent class to inherit it (IS-A). Deep inheritance hierarchies tend to cause **rigid, fragile coupling**: subclasses become tightly bound to their parent''s implementation details, and changing a base class can unexpectedly break every descendant several levels down (the "fragile base class" problem). `FlyingCar extends Car, Airplane` additionally hits the **diamond problem**: if both `Car` and `Airplane` define a method like `move()`, it''s ambiguous which implementation `FlyingCar` inherits (many languages, like Java, don''t even allow multiple class inheritance for this reason).\n\nComposition-based rewrite:\n\n```javascript\nclass FlyingCar {\n  constructor() {\n    this.driveBehavior = new DrivableBehavior();\n    this.flyBehavior = new FlyableBehavior();\n  }\n  drive() { this.driveBehavior.drive(); }\n  fly() { this.flyBehavior.fly(); }\n}\n```\n\nHere `FlyingCar` HAS-A drivable behavior and HAS-A flyable behavior, composed together, with no ambiguity about which `move()` wins and no rigid coupling to a `Car`/`Airplane` inheritance chain — behaviors can be swapped or extended independently.',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Computer Networks (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'TCP vs UDP',
  'tcp-vs-udp',
  E'Compare TCP and UDP: explain the key guarantees TCP provides that UDP does not, why UDP is still used at all despite being "less reliable," and give one real-world example of a use case better suited to each protocol.',
  'easy',
  (select id from challenge_categories where slug = 'computer-networks'),
  15, 20,
  array['computer-networks','tcp','udp'], array['Cisco','Juniper','Amazon'],
  '["TCP is connection-oriented (handshake) and guarantees ordered, reliable, in-sequence delivery with retransmission of lost packets; UDP is connectionless with no such guarantees.", "UDP''s lack of overhead (no handshake, no retransmission, no ordering buffer) makes it faster and lower-latency, which matters more than reliability for some applications.", "Think about applications where a late/retransmitted packet is worse than a dropped one (e.g. real-time media) versus applications where every byte matters (e.g. file transfer, web pages)."]'::jsonb,
  E'**TCP** is connection-oriented: it establishes a connection via a three-way handshake, then guarantees reliable, ordered, in-sequence delivery — lost packets are detected (via sequence numbers/acknowledgments) and retransmitted, and it provides flow/congestion control. This reliability comes at the cost of overhead and latency.\n\n**UDP** is connectionless: it sends packets ("datagrams") with no handshake, no delivery guarantee, no ordering, and no automatic retransmission. It''s used precisely because it avoids that overhead, giving lower latency and less bandwidth cost when perfect reliability isn''t worth the tradeoff.\n\n**When each wins**: TCP is right for a file download or a web page load, where every byte must arrive correctly and order matters (a corrupted download is useless). UDP is right for real-time video/voice calls or live multiplayer game state, where a dropped or late packet is better handled by simply skipping/interpolating than by stalling everything to wait for a retransmission of one old frame.',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'What Happens When You Type a URL and Press Enter',
  'what-happens-when-you-type-a-url-and-press-enter',
  E'Walk through, step by step, what happens between typing "https://example.com" into a browser and pressing Enter, and the page finishing rendering. Cover at least: DNS resolution, TCP connection setup, TLS handshake (since it''s HTTPS), the HTTP request/response, and browser rendering.',
  'medium',
  (select id from challenge_categories where slug = 'computer-networks'),
  25, 50,
  array['computer-networks','http','dns','tls'], array['Google','Amazon','Meta'],
  '["Start with DNS: the domain name has to be resolved to an IP address before anything else can happen (check browser cache, then OS cache, then a DNS resolver).", "TCP''s three-way handshake (SYN, SYN-ACK, ACK) establishes the connection before any HTTP data is sent.", "For HTTPS specifically, a TLS handshake happens after the TCP connection and before the HTTP request — don''t skip it just because the question says \"HTTP request/response\" later."]'::jsonb,
  E'1. **DNS resolution**: the browser checks its own cache, then the OS cache, then (if needed) queries a DNS resolver (often the ISP''s or a public one like 8.8.8.8), which walks the DNS hierarchy (root → TLD → authoritative nameserver) to resolve "example.com" to an IP address.\n\n2. **TCP connection**: the browser opens a TCP connection to that IP on port 443 (HTTPS) via the three-way handshake: SYN → SYN-ACK → ACK.\n\n3. **TLS handshake**: since the URL is HTTPS, a TLS handshake follows — the server presents its certificate, the client verifies it against a trusted CA, and they negotiate a shared symmetric session key used to encrypt everything from here on.\n\n4. **HTTP request/response**: the browser sends an HTTP GET request for "/" over the encrypted connection; the server processes it (routing, possibly hitting a database/app server) and returns an HTTP response with a status code, headers, and the HTML body.\n\n5. **Rendering**: the browser parses the HTML into a DOM tree, fetches additional resources it discovers (CSS, JS, images — each potentially triggering its own DNS/TCP/TLS/HTTP cycle, though connections are often reused via keep-alive), builds the CSSOM, combines them into a render tree, computes layout, and paints pixels to the screen; JavaScript execution can further modify the DOM and trigger re-renders.',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Quantitative Aptitude (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Train Speed and Crossing Time',
  'train-speed-and-crossing-time',
  E'A train 150 meters long is running at a speed of 54 km/h. Find the time it takes to completely cross a platform that is 100 meters long. Show your working.\n\n(A) 15 seconds  (B) 16.67 seconds  (C) 18.5 seconds  (D) 20 seconds',
  'easy',
  (select id from challenge_categories where slug = 'quantitative-aptitude'),
  10, 20,
  array['aptitude','speed-time-distance'], array['TCS NQT','Infosys','Wipro'],
  '["To completely cross the platform, the train must cover its own length PLUS the platform''s length.", "Convert km/h to m/s by multiplying by 5/18 to keep units consistent with meters.", "Time = total distance / speed."]'::jsonb,
  E'To fully cross a platform, the train must travel a distance equal to (train length + platform length) = 150 + 100 = 250 meters.\n\nConvert speed: 54 km/h × (5/18) = 15 m/s.\n\nTime = distance / speed = 250 / 15 = 16.67 seconds.\n\n**Answer: (B) 16.67 seconds.**',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Profit Percentage After Successive Discounts',
  'profit-percentage-after-successive-discounts',
  E'A shopkeeper marks an item 40% above its cost price, then offers two successive discounts of 10% and 5% on the marked price. Find the shopkeeper''s overall profit percentage on the cost price.\n\n(A) 18.6%  (B) 19.7%  (C) 20%  (D) 21.5%',
  'medium',
  (select id from challenge_categories where slug = 'quantitative-aptitude'),
  15, 30,
  array['aptitude','profit-loss','percentages'], array['TCS NQT','Accenture'],
  '["Assume a convenient cost price, like 100, to make the percentages easy to track.", "Apply the markup first to get the marked price, then apply each discount successively (each discount applies to the already-discounted price, not the original marked price).", "Successive percentage discounts do NOT simply add together — you must apply them one after another multiplicatively."]'::jsonb,
  E'Let cost price (CP) = 100.\n\nMarked price = 100 + 40% = 140.\n\nFirst discount of 10%: 140 × 0.90 = 126.\n\nSecond discount of 5% (applied to 126, not to 140): 126 × 0.95 = 119.7.\n\nSelling price = 119.7, CP = 100, so profit = 19.7.\n\n**Answer: (B) 19.7%.** The key trap is applying both discounts to the original marked price instead of applying the second discount to the already-discounted price.',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Logical Reasoning (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Find the Next Number in the Series',
  'find-the-next-number-in-the-series',
  E'Find the next number in the series: 2, 6, 12, 20, 30, ?\n\n(A) 36  (B) 40  (C) 42  (D) 44',
  'easy',
  (select id from challenge_categories where slug = 'logical-reasoning'),
  10, 20,
  array['aptitude','number-series','pattern-recognition'], array['Infosys','Cognizant'],
  '["Look at the differences between consecutive terms: 6-2, 12-6, 20-12, 30-20.", "Notice the pattern in those differences — do they increase by a constant amount?", "Alternatively, check if each term equals n × (n+1) for n = 1, 2, 3, 4, 5..."]'::jsonb,
  E'Differences between consecutive terms: 4, 6, 8, 10 — each difference increases by 2. The next difference should be 12, giving 30 + 12 = 42.\n\nCross-check with a closed form: each term equals n × (n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, so the 6th term is 6×7=42.\n\n**Answer: (C) 42.**',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Syllogism: Valid Conclusion',
  'syllogism-valid-conclusion',
  E'Given statements:\n1. All engineers are logical.\n2. Some logical people are creative.\n\nWhich conclusion definitely follows?\n\n(A) All engineers are creative.\n(B) Some engineers are creative.\n(C) No engineers are creative.\n(D) None of the above follows with certainty.',
  'medium',
  (select id from challenge_categories where slug = 'logical-reasoning'),
  15, 30,
  array['aptitude','syllogism','deductive-reasoning'], array['Infosys','TCS NQT'],
  '["Draw this out with sets/Venn diagrams: \"all engineers\" is a subset of \"logical people,\" and \"some logical people\" overlaps with \"creative people.\"", "The overlap between \"logical people\" and \"creative people\" might or might not include any engineers specifically — statement 2 only guarantees SOME logical people are creative, not which ones.", "Since the engineers-subset and the creative-overlap-subset of \"logical people\" aren''t guaranteed to intersect, no conclusion about engineers and creative people can be drawn with certainty."]'::jsonb,
  E'This is a classic syllogism trap. "All engineers are logical" places engineers entirely inside the "logical" set. "Some logical people are creative" only guarantees that *some* portion of the logical set overlaps with the creative set — but that overlapping portion is not guaranteed to include any engineers specifically (the "creative" logical people could all be non-engineers). Since we can''t be certain the engineer-subset and the creative-overlap-subset intersect, no definite conclusion about engineers and creativity follows.\n\n**Answer: (D) None of the above follows with certainty.**',
  'theory'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Verbal Ability (theory)
-- ---------------------------------------------------------------------
insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Sentence Correction: Subject-Verb Agreement',
  'sentence-correction-subject-verb-agreement',
  E'Identify and correct the grammatical error in the following sentence:\n\n"The list of requirements for the new project are extensive and needs to be reviewed by the whole team."\n\nExplain what the error is and rewrite the sentence correctly.',
  'easy',
  (select id from challenge_categories where slug = 'verbal-ability'),
  10, 20,
  array['aptitude','grammar','sentence-correction'], array['Infosys','Capgemini'],
  '["Identify the actual grammatical subject of the sentence — is it \"list\" or \"requirements\"?", "Prepositional phrases like \"of requirements\" between the subject and verb are a classic place subject-verb agreement errors hide.", "The verb must agree with \"list\" (singular), not \"requirements\" (the object of the preceding preposition)."]'::jsonb,
  E'The grammatical subject of the sentence is "list" (singular), not "requirements" (which is the object of the prepositional phrase "of requirements for the new project"). The verbs "are" and "needs" must both agree with the singular subject "list," but "are" incorrectly agrees with the plural "requirements" instead.\n\nCorrected: **"The list of requirements for the new project is extensive and needs to be reviewed by the whole team."**\n\nThis is a very common trap: a prepositional phrase sitting between the subject and the verb tempts you to match the verb to the nearby noun in that phrase instead of the true subject.',
  'theory'
) on conflict (slug) do nothing;

insert into challenges (title, slug, description, difficulty, category_id, estimated_minutes, xp_reward, tags, company_tags, hints, editorial, question_format)
values (
  'Reading Comprehension: Drawing an Inference',
  'reading-comprehension-drawing-an-inference',
  E'Read the passage and answer the question.\n\nPassage: "Despite the company''s revenue growing 20% year over year, its stock price fell sharply after the earnings call. Analysts pointed to the fact that revenue growth had decelerated from 35% the previous quarter, and that the company had not provided guidance for the next fiscal year, unlike in previous quarters."\n\nQuestion: Which of the following is the most reasonable inference from the passage?\n\n(A) The company is losing money.\n(B) Investors reacted more to the trend and lack of forward guidance than to the absolute growth number.\n(C) The company''s revenue actually declined this quarter.\n(D) Analysts believe the company will go bankrupt.',
  'medium',
  (select id from challenge_categories where slug = 'verbal-ability'),
  15, 30,
  array['aptitude','reading-comprehension','inference'], array['TCS NQT','Cognizant'],
  '["An inference question asks what the passage reasonably implies, not what it states directly — rule out options that require information not given (bankruptcy, actual decline) or that contradict the passage (20% growth means the company did NOT lose money/decline).", "Notice the passage explicitly mentions two things: growth DECELERATING (35% to 20%) and the ABSENCE of forward guidance — both are framed as reasons analysts gave for the stock reaction.", "The correct inference should be directly supported by details actually present in the passage, not an extreme claim the passage doesn''t support."]'::jsonb,
  E'(A) is false — 20% revenue growth means the company is not losing money in the sense implied. (C) contradicts the passage directly (revenue grew 20%, it did not decline). (D) is an extreme claim with no support in the passage — nothing suggests bankruptcy. (B) is directly supported: the passage explicitly cites deceleration from 35% to 20% and the missing forward guidance as the reasons analysts gave for the negative stock reaction, meaning investors reacted to the trend/uncertainty rather than the absolute (still-positive) growth figure.\n\n**Answer: (B).** The key inference skill here is distinguishing "what the passage supports" from "what sounds dramatic but isn''t actually stated or implied."',
  'theory'
) on conflict (slug) do nothing;
