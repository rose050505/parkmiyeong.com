import { useLang } from '../i18n.jsx'
import * as koHome from './home.js'
import * as enHome from './en/home.js'
import { how as koHow } from './how.js'
import { how as enHow } from './en/how.js'
import { projects as koProjects } from './projects.js'
import { projects as enProjects } from './en/projects.js'

const index = (list) => Object.fromEntries(list.map((p) => [p.slug, p]))

const content = {
  ko: { ...koHome, how: koHow, projects: koProjects, bySlug: index(koProjects) },
  en: { ...enHome, how: enHow, projects: enProjects, bySlug: index(enProjects) },
}

// 언어에 맞는 글 묶음. 영어판 글은 content/en/ 에 같은 모양으로 둔다.
export function useContent() {
  return content[useLang()]
}
