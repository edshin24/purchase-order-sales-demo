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
const REDIRECT_URL = "https://www.pdffiller.com/?mode=view";
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
    const response = await axios.post('https://oauth.airslate.com/public/oauth/token',
      `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(JWT_TOKEN)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        }
      }
    );

    setAccessToken(response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error('Error obtaining access token:', error.message);
    throw new Error(`Failed to get access token: ${error.message}`);
  }
};

const refreshToken = async () => {
  try {
    const response = await axios.post('https://oauth.airslate.com/public/oauth/token',
      `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(JWT_TOKEN)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        }
      }
    );
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
      console.warn('Unauthorized request when fetching organization. Attempting token refresh.');

      const newToken = await refreshToken();
      setAccessToken(newToken);

      try {
        const retryResponse = await axios.get(`${BASE_URL}/organizations?per_page=100`, {
            headers: await getHeaders(),
        });
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
  console.log("Payload: ", payload);

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

const getDocuments = async (organizationId, templateId) => {
  const endpoint = `${BASE_URL}/organizations/${organizationId}/templates/${templateId}/documents`;
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
  // console.log("Payload: ", payload);

  return await axios.post(endpoint, payload, { headers: await getHeaders() });
};

const prefillDocumentInTemplate = async (organizationId, templateId, document, orderData) => {
  const endpoint = `https://api.airslate.io/v1/organizations/${organizationId}/templates/${templateId}/documents/${document.id}`;
  console.log("Endpoint: " + endpoint);

  const preFillData = {
    fields: [
      {
        "id": getFieldIdByName("Order_Date"), 
        "type": "date",
        "name": "Order_Date",
        "value": orderData.date,
        "placeholder": ""
      },
      {
        "id": getFieldIdByName("Client_Name"), 
        "type": "text",
        "name": "Client_Name",
        "value": orderData.clientName,
        "placeholder": ""
      },
      {
        "id": getFieldIdByName("Address"), 
        "type": "text",
        "name": "Address",
        "value": orderData.address,
        "placeholder": ""
      },
      {
        "id": getFieldIdByName("City"), 
        "type": "text",
        "name": "City",
        "value": orderData.city,
        "placeholder": ""
      },
      {
        "id": getFieldIdByName("State"), 
        "type": "text",
        "name": "State",
        "value": orderData.state,
        "placeholder": ""
      },
      {
        "id": getFieldIdByName("Zip"), 
        "type": "text",
        "name": "Zip",
        "value": orderData.zip,
        "placeholder": ""
      }
    ]
  };

  const accessToken = await getAccessToken();
  await axios.patch(endpoint, preFillData, { headers: await getHeaders() });
}

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
    if (name === "Terms") {
      console.log("Terms Field: ", document.fields);
    }
    let field = document.fields.find(field => field.name === name);
    if (name === "Terms") {
      console.log("Terms Field: ", field);
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

  let Qty1 = 0, Qty2 = 0, Qty3 = 0;

  orderData.orderItems.forEach(item => {
    switch (item.product.name) {
      case "CloudConnect Pro Software":
        Qty1 = item.quantity;
        break;
      case "NetDefender Firewall":
        Qty2 = item.quantity;
        break;
      case "DataVault Pro Backup Solutions":
        Qty3 = item.quantity;
        break;
      default:
        break;
    }
  });

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
            "id": getFieldIdByName(document, "Terms"),
            "type": "text",
            "name": "Terms",
            "value": orderData.state,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Terms"),
            "type": "text",
            "name": "Qty1",
            "value": Qty1,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Terms"),
            "type": "text",
            "name": "Qty2",
            "value": Qty2,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Terms"),
            "type": "text",
            "name": "Qty3",
            "value": Qty3,
            "placeholder": ""
          },
          {
            "id": getFieldIdByName(document, "Subtotal"),
            "type": "text",
            "name": "Subtotal",
            "value": orderData.subtotal,
            "placeholder": ""
          }    
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

module.exports = {
  getOrganization,
  createOrganization,
  getTemplate,
  createTemplate,
  getDocuments,
  getDocument,
  uploadDocument,
  getBase64Content,
  prefillDocumentInTemplate,
  fetchDocumentFields,
  createFlow,
  getFlowDocuments,
  getFlowDocument,
  distributeTemplate,
  distributeFlow
};