import {
  getCache,
  setCache,
} from '../../lib/cache';

import {
  getOrganization,
  createOrganization,
  getTemplate,
  createTemplate,
  getTemplateVersions,
  publishTemplateVersion,
  getVersionedDocuments,
  getDocument,
  getDocuments,
  uploadDocument,
  createFlow,
  distributeFlow,
  getFlowLinks
} from '../../lib/api';

export default async (req, res) => {
  const orderData = req.body;
  console.log("Form Data: ", orderData);
  console.log("orderItems: ", orderData.orderItems);

  let organizationId = getCache('organizationId');
  let templateId = getCache('templateId');
  let versionId = getCache('versionId');
  let published = getCache('published');
  let documentId = getCache('documentId');
  let flowId = getCache('flowId');
  let roleId = getCache('roleId');

  console.log("organizationId: ", organizationId);
  console.log("templateId: ", templateId);
  console.log("versionId: ", versionId);
  console.log("published: ", published);
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

        template.template_version.id = versionId;
        setCache('versionId', versionId);
      }
  
      templateId = template.id;
      setCache('templateId', templateId);
    }

    if (!versionId) {
      let templateVersion = await getTemplateVersions(organizationId, templateId);

      if (templateVersion) {
        console.log("Version found: ", templateVersion);

        versionId = templateVersion[0].id;
      }

      if (templateVersion[0].status === 'PUBLISHED') {
        published = true;
        setCache('published', true);
      }
      else {
        setCache('published', false);
      }
    }

    let document = null;

    let versionedDocuments = await getVersionedDocuments(organizationId, templateId, versionId);
    console.log("versionedDocuments: ", versionedDocuments);

    if (!documentId) {
      document = await getPurchaseOrderDocument(organizationId, templateId, versionId);
    }
    else {
      document = await getDocument(organizationId, templateId, documentId);
      console.log("Document Found: ", document);
    }

    if (!published) {
      let publishedTemplateVersion = await publishTemplateVersion(
        organizationId, templateId, versionId);

      console.log("publishedTemplateVersion: ", publishedTemplateVersion);

      console.log("Retrieving new documents.");
      document = await getPurchaseOrderDocument(organizationId, templateId, versionId);

      setCache('published', true);
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
      }
      else {
        url = flowLink.url;
      }
    }

    res.status(200).json(url);
  }
  catch (error) {
    if (error.response) {
        console.error("Error Data:", error.response.data);
        console.error("Error Status:", error.response.status);
        res.status(error.response.status).json({ error: error.response.data });
        console.error(`Error: ${error.message}\n${error.stack}`);
        console.error(error);
        console.error(error.response.data.errors);
    }
    else {
        console.error("Error Message:", error.message);
        console.error(error);
        res.status(500).json({ error: error.message });
    }
  }
};

const getPurchaseOrderDocument = async (organizationId, templateId, versionId) => {
  const documents = await getDocuments(organizationId, templateId);

  let purchaseOrderDocumentsData;

  if (documents) {
    purchaseOrderDocumentsData = documents.data.find(
      documentEntry => documentEntry.name === "IT Purchase Order"
    );
  }

  let document = null;

  let versionedDocuments = await getVersionedDocuments(organizationId, templateId, versionId)
  console.log("getVersionedDocuments: ", versionedDocuments);

  if (purchaseOrderDocumentsData) {
    document = await getDocument(organizationId, templateId, purchaseOrderDocumentsData.id);
    console.log("Document Found: ", document);

    let products = document.fields.find(
      fieldEntry => fieldEntry.name === "Products"
    );
    console.log("products: ", products);
  }
  else {
    const newDocument = await uploadDocument(organizationId, templateId);
    document = newDocument.data;
    console.log("Document Uploaded:", document);
  }

  setCache('documentId', document.id);

  return document;
};
