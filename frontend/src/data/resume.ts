// The PDF is built from resume/resume.html by `npm run resume` and lands in
// public/. BASE_URL matters: the published site lives under /janit-portfolio/,
// so a bare '/Janit_B_Resume.pdf' pointed at jnt-h04.github.io/ and 404'd.
export const RESUME_URL = `${import.meta.env.BASE_URL}Janit_B_Resume.pdf`
export const RESUME_FILE = 'Janit_B_Resume.pdf'
