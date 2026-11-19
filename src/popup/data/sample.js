// SAMPLE DATA: used only to develop the interface in Phase 2.
// Every record carries `isSample: true` and the UI labels it as a sample.
// None of this was extracted from a real Claude conversation.

const now = Date.now();
const H = 3_600_000;
const D = 24 * H;

export const SAMPLE_PROJECTS = [
  {
    id: 'sample-inventory-api',
    isSample: true,
    name: 'Inventory API',
    description: 'REST API for warehouse stock tracking with role-based access and CSV import.',
    instructions:
      'Use ES modules. Keep controllers thin and put business logic in services/. Write a Vitest test for every service function.',
    stack: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Vitest'],
    updatedAt: now - 2 * H,
    lastBackupAt: now - 26 * H,
    backupStatus: 'stale',
    lastWorkingPoint:
      'Writing cursor pagination for GET /items. The cursor encoder in src/utils/cursor.js is unfinished.',
    tasks: [
      { id: 't1', title: 'Project scaffolding and ESLint config', status: 'completed' },
      { id: 't2', title: 'Prisma schema for items and locations', status: 'completed' },
      { id: 't3', title: 'JWT auth middleware', status: 'completed' },
      { id: 't4', title: 'CRUD routes for /items', status: 'completed' },
      { id: 't5', title: 'Cursor pagination for GET /items', status: 'working' },
      { id: 't6', title: 'Role-based permissions (admin, staff)', status: 'pending' },
      { id: 't7', title: 'Bulk CSV import endpoint', status: 'pending' },
      { id: 't8', title: 'Flaky transaction test in stock transfer', status: 'issue' },
    ],
    files: [
      { id: 'f1', path: 'src/app.js', status: 'created', evidence: 'attachment' },
      { id: 'f2', path: 'prisma/schema.prisma', status: 'created', evidence: 'attachment' },
      { id: 'f3', path: 'src/middleware/auth.js', status: 'created', evidence: 'attachment' },
      { id: 'f4', path: 'src/routes/items.js', status: 'modified', evidence: 'attachment' },
      { id: 'f5', path: 'src/routes/legacyItems.js', status: 'deleted', evidence: 'mentioned' },
      { id: 'f6', path: 'src/utils/cursor.js', status: 'pending', evidence: 'mentioned' },
      { id: 'f7', path: 'tests/items.test.js', status: 'pending', evidence: 'mentioned' },
      { id: 'f8', path: 'src/services/stockService.js', status: 'unavailable', evidence: 'mentioned' },
    ],
    conversations: [
      {
        id: 'c1',
        title: 'Cursor pagination design',
        updatedAt: now - 2 * H,
        messages: [
          { id: 'm1', role: 'user', text: 'GET /items is slow with 200k rows. Can we switch from offset to cursor pagination?' },
          { id: 'm2', role: 'assistant', text: 'Yes. Encode the last row\'s (createdAt, id) pair as an opaque cursor and query with a composite WHERE clause. Here is a first version of the encoder:', code: 'export const encodeCursor = ({ createdAt, id }) =>\n  Buffer.from(`${createdAt.toISOString()}|${id}`).toString(\'base64url\');' },
          { id: 'm3', role: 'user', text: 'Prisma throws "Invalid value for argument cursor" when I pass it straight in.' },
        ],
      },
      {
        id: 'c2',
        title: 'JWT auth middleware',
        updatedAt: now - 3 * D,
        messages: [
          { id: 'm4', role: 'user', text: 'Add JWT auth middleware that reads the token from the Authorization header.' },
          { id: 'm5', role: 'assistant', text: 'Created src/middleware/auth.js. It verifies the token with jsonwebtoken and attaches req.user.' },
        ],
      },
    ],
    context: [
      { title: 'Project overview', body: 'REST API for warehouse stock tracking.' },
      { title: 'Objectives', body: ['Fast item search at 200k+ rows', 'Role-based access for admin and staff', 'Bulk CSV import'] },
      { title: 'Technology stack', body: 'Node.js, Express, PostgreSQL, Prisma, Vitest.' },
      { title: 'Architecture', body: 'Routes call controllers, controllers call services, services call Prisma. Auth is middleware.' },
      { title: 'Features implemented', body: ['Project scaffolding', 'Item CRUD', 'JWT auth'] },
      { title: 'Files created', body: ['src/app.js', 'prisma/schema.prisma', 'src/middleware/auth.js'] },
      { title: 'Files modified', body: ['src/routes/items.js'] },
      { title: 'Pending features', body: ['Cursor pagination', 'Role permissions', 'CSV import'] },
      { title: 'Known bugs and errors', body: ['Prisma rejects the cursor format', 'Flaky stock transfer test'] },
      { title: 'Technical decisions', body: ['Cursor pagination over offset for large tables', 'Services own all business logic'] },
      { title: 'Current development status', body: 'Pagination is in progress and blocked on the cursor format.' },
      { title: 'Next steps', body: ['Fix the cursor encoder', 'Add pagination tests', 'Start role permissions'] },
    ],
  },
  {
    id: 'sample-portfolio',
    isSample: true,
    name: 'Portfolio site',
    description: 'Static personal site with a blog and project gallery.',
    instructions: '',
    stack: ['Astro', 'Tailwind CSS'],
    updatedAt: now - 9 * D,
    lastBackupAt: null,
    backupStatus: 'none',
    lastWorkingPoint: 'Blog index page is done. Gallery layout has not been started.',
    tasks: [
      { id: 'p1', title: 'Astro project setup', status: 'completed' },
      { id: 'p2', title: 'Blog index page', status: 'completed' },
      { id: 'p3', title: 'Project gallery', status: 'pending' },
    ],
    files: [{ id: 'pf1', path: 'src/pages/blog/index.astro', status: 'created', evidence: 'attachment' }],
    conversations: [],
    context: [],
  },
];
