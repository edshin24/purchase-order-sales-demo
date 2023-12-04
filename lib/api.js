import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://api.airslate.io/v1';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const JWT_TOKEN = process.env.JWT_TOKEN;

const ORGANIZATION = "Technology Solutions Inc.";
const SUBDOMAIN = "tech-solutions";
const TEMPLATE = "Purchase Order Template";
const REDIRECT_URL = "https://www.google.com";
const DOCUMENT = "IT Purchase Order.docx";

let inMemoryTokenStore = {
  ACCESS_TOKEN: null
};

const setAccessToken = token => {
  inMemoryTokenStore.ACCESS_TOKEN = token;
};

const getAccessToken = async () => {
  if (inMemoryTokenStore.ACCESS_TOKEN) {
    return inMemoryTokenStore.ACCESS_TOKEN;
  }

  try {
    const accessToken = await obtainAccessToken();
    setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error obtaining access token:', error.message);
    throw new Error(`Failed to get access token: ${error.message}`);
  }
};

const obtainAccessToken = async () => {
  try {
    const endpoint = 'https://oauth.airslate.com/public/oauth/token';

    const grantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
    const encodedGrantType = encodeURIComponent(grantType);
    const encodedJwtToken = encodeURIComponent(JWT_TOKEN);

    const payload = `grant_type=${encodedGrantType}&assertion=${encodedJwtToken}`;

    const options = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios.post(endpoint, payload, options);

    return response.data.access_token;
  } catch (error) {
    console.error('Error refreshing the access token:', error.message);
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
};

const getHeaders = async () => {
  const accessToken = await getAccessToken();
  return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
  };
};

const getOrganization = async () => {
  try {
    const endpoint = `${BASE_URL}/organizations?per_page=100`;
    console.log("Endpoint: " + endpoint);

    const response = await axios.get(endpoint, { headers: await getHeaders() });

    return response.data.data.find(org => org.name === ORGANIZATION);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request when fetching organizations. Attempting token refresh.');

      const newToken = await obtainAccessToken();
      setAccessToken(newToken);

      try {
        const retryResponse = await axios.get(endpoint, { headers: await getHeaders() });

        return retryResponse.data.data.find(org => org.name === ORGANIZATION);
      } catch (retryError) {
        const errorMessage = `Failed to retrieve the organization after refreshing the token: ${retryError.message}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    } else {
      const errorMessage = `Failed to retrieve organization: ${error.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
};

const createOrganization = async () => {
  const endpoint = `${BASE_URL}/organizations`;
  console.log("Endpoint: " + endpoint);

  const payload = {
    name: ORGANIZATION,
    subdomain: SUBDOMAIN
  };

  return await axios.post(endpoint, payload, { headers: await getHeaders() });
};

const getTemplate = async (organizationId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates?per_page=100`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data.data.find(template => template.name === TEMPLATE);
};

const createTemplate = async (organizationId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates`;
  console.log("Endpoint: " + endpoint);

  const payload = {
    name: TEMPLATE,
    description: "Purchase Order Template",
    redirect_url: REDIRECT_URL
  };
  console.log("Payload: ", payload);

  const response = await axios.post(endpoint, payload, { headers: await getHeaders() });

  return response.data;
};

const getTemplateVersions = async (organizationId, templateId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/versions`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data.data;
};

const publishTemplateVersion = async (organizationId, templateId, versionId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/versions/${versionId}/publish`;
  console.log("Endpoint: " + endpoint);

  const payload = {};

  const response = await axios.patch(endpoint, payload, { headers: await getHeaders() });

  return response.data;
};

const getDocuments = async (organizationId, templateId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });
  console.log("getDocuments: ", response.data);

  return response.data;
};

const getVersionedDocuments = async (organizationId, templateId, versionId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/versions/${versionId}/documents`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data;
};

const getDocument = async (organizationId, templateId, documentId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents/${documentId}`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data;
};

const getBase64Content = () => {
  const filePath = path.join(process.cwd(), 'IT Purchase Order.docx.base64');
  const base64Content = fs.readFileSync(filePath, 'utf-8');
  return base64Content;
};

const uploadDocument = async (organizationId, templateId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents`;
  console.log("Endpoint: " + endpoint);

  const payload = {
    name: DOCUMENT,
    type: "DOC_GENERATION",
    content: getBase64Content()
  };

  return await axios.post(endpoint, payload, { headers: await getHeaders() });
};

const fetchDocumentFields = async (organizationId, templateId, documentId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents/${documentId}`;
  console.log("Endpoint: " + endpoint);

  try {
    const response = await axios.get(endpoint, { headers: await getHeaders() });

    console.log('API Response:', response.data);

    if (!response.data || !response.data.fields) {
      throw new Error('API response did not match expected structure.');
    }

    return response.data.fields;
  } catch (error) {
    console.error(`Failed to fetch document fields: ${error}`);
    throw error;
  }
};

function getFieldIdByName(document, name) {
  if (document) {
    let field = document.fields.find(field => field.name === name);

    if (!field) {
      console.log("getFieldIdByName: ", name);
    }

    return field.id;
  }
}

const createFlow = async (organizationId, templateId, document, orderData) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows`;
  console.log("Endpoint: " + endpoint);

  if(document) {
    console.log("Document ID: " + document.id);
  }
  else {
    console.log("Document ID: documentData is undefined");
  }

  const products = orderData.orderItems.map(item => ({
    ItemId: item.product.itemId,
    Name: item.product.name,
    Price: (item.product.price).toString(),
    Qty: (item.quantity).toString(),
    Amount: (item.product.price * item.quantity).toFixed(2)
  }));

  const discount = 0;
  const taxRate = 8;
  const tax = Math.floor(orderData.subtotal * 8) / 100;
  const total = (orderData.subtotal - discount + tax).toFixed(2);

  const payload = {
    documents: [
      {
        id: document.id,
        fields: [
          {
              "id": getFieldIdByName(document, "Order_Date"), 
              "type": "date",
              "name": "Order_Date",
              "value": orderData.date,
              "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Client_Name"), 
            "type": "text",
            "name": "Client_Name",
            "value": orderData.clientName,
            "placeholder": ""
        },
        {
            "id": getFieldIdByName(document, "Address"), 
            "type": "text",
            "name": "Address",
            "value": orderData.address,
            "placeholder": ""
          },
          {
              "id": getFieldIdByName(document, "City"), 
              "type": "text",
              "name": "City",
              "value": orderData.city,
              "placeholder": ""
          },
          {
              "id": getFieldIdByName(document, "State"), 
              "type": "text",
              "name": "State",
              "value": orderData.state,
              "placeholder": ""
          },
          {
              "id": getFieldIdByName(document, "Zip"), 
              "type": "text",
              "name": "Zip",
              "value": orderData.zip,
              "placeholder": ""
          },
          {
            "name": "Products",
            "value": products
          },
          {
            "id": getFieldIdByName(document, "Terms"),
            "type": "text",
            "name": "Terms",
            "value": orderData.state,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Subtotal"),
            "type": "text",
            "name": "Subtotal",
            "value": orderData.subtotal,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Discount"), 
            "type": "text",
            "name": "Discount",
            "value": discount.toString(),
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "TaxRate"), 
            "type": "text",
            "name": "TaxRate",
            "value": taxRate,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Tax"), 
            "type": "text",
            "name": "Tax",
            "value": tax,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Total"),
            "type": "text",
            "name": "Total",
            "value": total,
            "placeholder": ""
          },
        ]
      }
    ]
  };
  console.log("Payload: ");
  console.log(JSON.stringify(payload, null, 2));

  const response = await axios.post(endpoint, payload, { headers: await getHeaders() });
  return response.data;
};

const getFlowDocuments = async (organizationId, templateId, flowId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/documents`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data.data;
};

const getFlowDocument = async (organizationId, templateId, flowId, documentId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/documents/${documentId}`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });

  return response.data.fields;
};

const distributeTemplate = async (organizationId, templateId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/distribute`;
  console.log("Endpoint: " + endpoint);

  const payload = {
    is_enabled: true
  };
  console.log("Payload: ", payload);

  return await axios.patch(endpoint, payload, { headers: await getHeaders() });
};

const distributeFlow = async (organizationId, templateId, flowId, roleId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/share`;
  console.log("Endpoint: " + endpoint);

  const payload = {
    data: [
      {
        auth_method: "none",
        expire: 60,
        role_id: roleId
      }
    ]
  };
  console.log("Payload: ", payload);

  return await axios.post(endpoint, payload, { headers: await getHeaders() });
};

const getFlowLinks = async (organizationId, templateId, flowId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/flows/${flowId}/links`;
  console.log("Endpoint: " + endpoint);

  const response = await axios.get(endpoint, { headers: await getHeaders() });
  return response.data;
};

module.exports = {
  getOrganization,
  createOrganization,
  getTemplate,
  createTemplate,
  getTemplateVersions,
  publishTemplateVersion,
  getDocument,
  getDocuments,
  getVersionedDocuments,
  uploadDocument,
  getBase64Content,
  fetchDocumentFields,
  createFlow,
  getFlowDocuments,
  getFlowDocument,
  distributeTemplate,
  distributeFlow,
  getFlowLinks
};