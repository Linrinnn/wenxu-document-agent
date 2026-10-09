export type DocumentType='book'|'paper'|'proposal'|'report'|'manual';
export interface Source {id:string;name:string;text:string;createdAt:string}
export interface Chapter {id:string;title:string;content:string;review:string}
export interface Revision {id:string;chapterId:string;title:string;content:string;reason:string;createdAt:string}
export interface Project {id:string;title:string;documentType:DocumentType;requirements:string;audience:string;sources:Source[];chapters:Chapter[];revisions:Revision[];version:number;updatedAt:string}
export interface Identity {alias:string;mode:'local'|'cloud'}
export const DOCUMENT_LABELS:Record<DocumentType,string>={book:'書籍',paper:'論文',proposal:'計畫書',report:'研究報告',manual:'手冊'};
