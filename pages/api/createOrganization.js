import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async (req, res) => {
  const BASE_URL = 'https://api.airslate.io/v1';
  const AUTHORIZATION_TOKEN = req.body.authorizationToken;
  const ORG_NAME = "Technology Solutions Inc.";
  const ORG_SUBDOMAIN = "tech-solutions";
  const EMAIL = "edward.shin@airslate.com";

  const defaultHeaders = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${AUTHORIZATION_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const getOrganization = async () => {
    const response = await axios.get(`${BASE_URL}/organizations?per_page=100`, {
      headers: defaultHeaders,
    });
    return response.data.data.find(org => org.name === ORG_NAME);
  };

  const createOrganization = async () => {
    return await axios.post(`${BASE_URL}/organizations`, {
      name: ORG_NAME,
      subdomain: ORG_SUBDOMAIN,
    }, { headers: defaultHeaders });
  };

  const getTemplate = async (organizationId) => {
    const response = await axios.get(`${BASE_URL}/organizations/${organizationId}/templates?per_page=100`, {
      headers: defaultHeaders,
    });
    return response.data.data.find(template => template.name === "Purchase Order Template");
  };

  const createTemplate = async (organizationId) => {
    return await axios.post(`${BASE_URL}/organizations/${organizationId}/templates`, {
      name: "Purchase Order Template",
      description: "Purchase Order Template",
      redirect_url: "https://www.pdffiller.com/?mode=view"
    }, { headers: defaultHeaders });
  };

  const getDocument = async (organizationId, templateId) => {
    const response = await axios.get(`${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents`, {
      headers: defaultHeaders,
    });
    const foundDocument = response.data.data.find(doc => doc.name === "IT_Purchase_Order");
    return Boolean(foundDocument);
  };

  const uploadDocument = async (organizationId, templateId, content) => {
    return await axios.post(`${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents`, {
      name: "IT_Purchase_Order.docx",
      type: "DOC_GENERATION",
      content: content
    }, { headers: defaultHeaders });
  };

  const getBase64Content = () => {
    // Set the path to the public folder and then to the file within it
    const filePath = path.join(process.cwd(), 'IT_Purchase_Order_Base64.txt');
    
    // Read the file content synchronously
    const base64Content = fs.readFileSync(filePath, 'utf-8');
    return base64Content;
  };

  const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: defaultHeaders,
  });
  
  // Request interceptor
  axiosInstance.interceptors.request.use(request => {
    console.log('Starting Request for Create Flow:', JSON.stringify(request, null, 2));
    return request;
  });
  
  // Response interceptor
  axiosInstance.interceptors.response.use(response => {
    console.log('Response for Create Flow:', JSON.stringify(response.data, null, 2));
    return response;
  }, error => {
    console.error('Error Response for Create Flow:', JSON.stringify(error.response ? error.response.data : error.message, null, 2));
    return Promise.reject(error);
  });
  
  const createFlow = async (organizationId, templateId, documentId) => {
    const documentData = [
      {
        id: documentId,
        fields: []
      }
    ];
  
    try {
      const response = await axiosInstance.post(`/organizations/${organizationId}/templates/${templateId}/flows`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const sendInvite = async (organizationId, templateId, flowId, roleId) => {
    const inviteData = [
      {
        "role_id": roleId,
        "email": EMAIL
      }
    ];
  
    // Log the exact payload
    console.log('Sending Invite Payload:', {
      baseURL: `${BASE_URL}`,
      endpoint: `/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/invite`,
      data: { data: inviteData },
      headers: defaultHeaders
    });
  
    return await axios.post(
      `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/invite`,
      { data: inviteData },
      { headers: defaultHeaders }
    );
  };
  
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

    let document = await getDocument(organization.id, template.id);

    if (document) {
      console.log("Document found:", document);
    } else {
      const base64Content = getBase64Content();
      const newDocument = await uploadDocument(organization.id, template.id, base64Content);
      document = newDocument.data;
      console.log("Document uploaded:", document);
    }
  
    const flow = await createFlow(organization.id, template.id, document.id);
    console.log("Flow created:", flow);

    const invite = await sendInvite(organization.id, template.id, flow.id, flow.available_roles[0].id);
    console.log("Invite sent:", invite.data);
  
    res.status(200).json(invite.data);
  } catch (error) {
    if (error.response) {
        console.error("Error Data:", error.response.data);
        console.error("Error Status:", error.response.status);
        res.status(error.response.status).json({ error: error.response.data });
    } else {
        console.error("Error Message:", error.message);
        res.status(500).json({ error: error.message });
    }
  }
};