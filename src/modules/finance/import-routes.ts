import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard,requireIdentity,type createVerifier } from '../auth/identity.js';
import { EmptyQuery,ErrorResponses } from '../../shared/http/schemas.js';
import type { FileImportRepository } from './import-repository.js';
import * as C from './import-contracts.js';
export function fileImportRoutes(app:FastifyInstance,repo:FileImportRepository,verify:ReturnType<typeof createVerifier>){
  const r=app.withTypeProvider<TypeBoxTypeProvider>(),base='/api/v1/finance/imports',onRequest=authGuard(verify),common={tags:['Financial File Import'],security:[{bearerAuth:[]}],querystring:EmptyQuery};
  r.post(base,{onRequest,bodyLimit:3*1024*1024,schema:{...common,operationId:'analyzeFinancialFile',body:C.ImportUpload,response:{201:C.ImportBatch,...ErrorResponses}}},async(req,reply)=>reply.code(201).send(await repo.analyze(requireIdentity(req).authUserId,req.body)));
  r.get(base,{onRequest,schema:{...common,operationId:'listFinancialFileImports',querystring:C.ImportHistoryQuery,response:{200:C.ImportHistory,...ErrorResponses}}},req=>repo.history(requireIdentity(req).authUserId,req.query));
  r.get(base+'/:id',{onRequest,schema:{...common,operationId:'previewFinancialFileImport',params:C.ImportParams,querystring:C.ImportPageQuery,response:{200:C.ImportPreview,...ErrorResponses}}},req=>repo.preview(requireIdentity(req).authUserId,req.params.id,Number(req.query.offset??'0')));
  r.put(base+'/:id/mapping',{onRequest,schema:{...common,operationId:'mapFinancialFileImport',params:C.ImportParams,body:C.ImportMapInput,response:{200:C.ImportBatch,...ErrorResponses}}},req=>repo.map(requireIdentity(req).authUserId,req.params.id,req.body));
  r.post(base+'/:id/inbox',{onRequest,schema:{...common,operationId:'sendFileRowsToInbox',params:C.ImportParams,body:C.ImportSelect,response:{200:C.ImportResult,...ErrorResponses}}},req=>repo.select(requireIdentity(req).authUserId,req.params.id,req.body));
}
