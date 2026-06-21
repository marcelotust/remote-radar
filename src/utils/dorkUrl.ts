export const buildDorkUrl = (companyName: string): string => {
  const query = `site:linkedin.com/in "${companyName}" ("Frontend" OR "Software Engineer" OR "Tech Recruiter") "Brasil"`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
