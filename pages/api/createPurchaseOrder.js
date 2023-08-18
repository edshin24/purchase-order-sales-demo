import axios from 'axios';

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
  distributeFlow
} from '../../lib/api';

export default async (req, res) => {
  const orderData = req.body;

  try {
    let organization = await getOrganization();

    if (organization) {
      console.log("Organization found:", organization);
    } else {
      const orgResponse = await createOrganization();
      organization = orgResponse.data;
      console.log("Organization created:", organization);
    }    
    let template = await getTemplate(organization.id);
    
    if (template) {
      console.log("Template found:", template);
    } else {
      template = await createTemplate(organization.id);
      console.log("Template created:", template);
    }

    let documents = await getDocuments(organization.id, template.id);
    console.log("Documents: ", documents);

    let document = null;
    if (documents) {
      let purchaseOrderDoc = documents.data.find(
        documentEntry => documentEntry.name === "IT Purchase Order"
      );
      
      if (purchaseOrderDoc) {
        document = await getDocument(organization.id, template.id, purchaseOrderDoc.id);
        console.log("Document: ", document);
      } else {
        const newDocument = await uploadDocument(organization.id, template.id);
        document = newDocument.data;
        console.log("Document uploaded:", document);
      }
    }
    
    // const preFilledResponse = await prefillDocument(organization.id, template.id, document, orderData);
    // const fields = await fetchDocumentFields(organization.id, template.id, document.id);
    // console.log("Document fields after pre-filling:", fields);

    const flow = await createFlow(organization.id, template.id, document, orderData);
    console.log("Flow created:", flow);

    // const flowDocuments = await getFlowDocuments(organization.id, template.id, flow.id);
    // console.log("Flow Documents:", flowDocuments);

    // if (flowDocuments && !(flowDocuments.length === 0)) {
    //   const flowDocument = await getFlowDocument(organization.id, template.id, flow.id, flowDocuments[0].id);
    //   console.log("Flow Document:", flowDocument);
    // }

    // distTemplate
    // const distTemplate = await distributeTemplate(organization.id, template.id);
    // console.log("Shareable link generated:", distTemplate.data);
    // const url = distTemplate.data.urls_embedded['Role 1'];
    // console.log("Embedded URL: ", url);
    
    // distFlow
    let url = "";
    if (flow) {
      const distFlow = await distributeFlow(organization.id, template.id, flow.id, flow.available_roles[0].id);
      console.log("DistFlow data.data: ", distFlow.data.data);

      if (distFlow && distFlow.data.data && distFlow.data.data.length > 0) {
        url = distFlow.data.data[0].url;
        console.log("Assigned URL:", url);
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