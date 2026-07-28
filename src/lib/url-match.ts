export function matchURL(pattern: string, url: string): boolean {
  if (!pattern) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    const slashIndex = pattern.indexOf('/');
    const domainPart = slashIndex === -1 ? pattern : pattern.substring(0, slashIndex);
    const pathPart = slashIndex === -1 ? null : pattern.substring(slashIndex);

    const domainMatches = domainPart.includes('*')
      ? new RegExp(`^(.*\\.)?${domainPart.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`, 'i').test(hostname)
      : hostname === domainPart || hostname.endsWith(`.${domainPart}`);

    if (!domainMatches) return false;

    if (pathPart === null) return true;

    const pathRegex = new RegExp(`^${pathPart.replace(/\*/g, '.*')}$`);
    return pathRegex.test(pathname);
  } catch {
    return false;
  }
}
