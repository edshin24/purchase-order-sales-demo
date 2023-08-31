import {
  getCache,
  setCache,
  clearCache
} from '../../lib/cache';

import {
  getOrganization,
  createOrganization,
  getTemplate,
  createTemplate,
  getDocuments,
  getDocument,
  uploadDocument,
  createFlow,
  getFlowDocuments,
  getFlowDocument,
  distributeTemplate,
  distributeFlow,
  getFlowLinks
} from '../../lib/api';

export default async (req, res) => {
  const orderData = req.body;
  console.log("Form Data: ", orderData);

  let organizationId = getCache('organizationId');
  let templateId = getCache('templateId');
  let documentId = getCache('documentId');
  let flowId = getCache('flowId');
  let roleId = getCache('roleId');

  console.log("organizationId: ", organizationId);
  console.log("templateId: ", templateId);
  console.log("documentId: ", documentId);
  console.log("flowId: ", flowId);
  console.log("roleId: ", roleId);

  try {
    if (!organizationId) {
      let organization = await getOrganization();

      if (organization) {
        console.log("Organization found:", organization);
      } else {
        const orgResponse = await createOrganization();
        organization = orgResponse.data;
        console.log("Organization created:", organization);
      }

      organizationId = organization.id;
      setCache('organizationId', organizationId);
    }

    if (!templateId) {
      let template = await getTemplate(organizationId);
    
      if (template) {
        console.log("Template found:", template);
      } else {
        template = await createTemplate(organizationId);
        console.log("Template created:", template);
      }
  
      templateId = template.id;
      setCache('templateId', templateId);
    }

    let document = null;

    if (!documentId) {
      const documents = await getDocuments(organizationId, templateId);
      console.log("Documents: ", documents);

      let purchaseOrderDoc;

      if (documents) {
        purchaseOrderDoc = documents.data.find(
          documentEntry => documentEntry.name === "IT Purchase Order"
        );
      }

      if (purchaseOrderDoc) {
        document = await getDocument(organizationId, templateId, purchaseOrderDoc.id);
        console.log("Document Found: ", document);
      } else {
        const newDocument = await uploadDocument(organizationId, templateId);
        document = newDocument.data;
        console.log("Document Uploaded:", document);
      }
      documentId = document.id;
      setCache('documentId', documentId);
    } else {
      document = await getDocument(organizationId, templateId, documentId);
      console.log("Document Found: ", document);
   }

    let flow;
    if (!flowId) {
      flow = await createFlow(organizationId, templateId, document, orderData);
      console.log("Flow: ", flow);

      flowId = flow.id;
      setCache('flowId', flowId);

      roleId = flow.available_roles[0].id;
      console.log("roleId: ", roleId);
      setCache('roleId', roleId);
    }

    let url = "";
    if (flowId) {
      const flowLinks = await getFlowLinks(organizationId, templateId, flowId);
      console.log(flowLinks);

      const flowLink = flowLinks.data.find(
        flowEntry => flowEntry.role_id === roleId
      );

      if (!flowLink) {
        const distFlow = await distributeFlow(organizationId, templateId, flowId, roleId);
        console.log("DistFlow data.data: ", distFlow.data.data);
  
        if (distFlow && distFlow.data.data && distFlow.data.data.length > 0) {
          url = distFlow.data.data[0].url;
          console.log("Assigned URL:", url);
        }
      } else {
        url = flowLink.url;
      }
    }
    
    res.status(200).json(url);
  } catch (error) {
    if (error.response) {
        console.error("Error Data:", error.response.data);
        console.error("Error Status:", error.response.status);
        res.status(error.response.status).json({ error: error.response.data });
        console.error(`Error: ${error.message}\n${error.stack}`);
    } else {
        console.error("Error Message:", error.message);
        res.status(500).json({ error: error.message });
    }
  }
};