'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import ProductAutocomplete from './ProductAutocomplete';

function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 p-4 bg-green-500 text-white rounded-md shadow-md">
      {message}
    </div>
  );
}

export default function PurchaseOrder() {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [purchaseOrderItems, setPurchaseOrderItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get today's date in the format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  const products = [
    {
      name: "CloudConnect Pro Software",
      itemId: "CCP123",
      price: 99.99,
    },
    {
      name: "NetDefender Firewall",
      itemId: "NDF456",
      price: 149.99,
    },
    {
      name: "DataVault Pro Backup Solutions",
      itemId: "DVP789",
      price: 199.99,
    },
  ];

  const handleSelectedQuantityChange = (e) => {
    setSelectedQuantity(e.target.value);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    setPurchaseOrderItems(prevItems => {
       return prevItems.map(item => {
          if (item.product.itemId === itemId) {
             return {...item, quantity: newQuantity};
          }
          return item;
       });
    });
  };

  const [toastMessage, setToastMessage] = useState("");

  const handleAddProduct = () => {
    if (!selectedProduct || !selectedQuantity) return;
  
    const quantityToUse = parseInt(selectedQuantity, 10) || 0;
  
    const existingProduct = purchaseOrderItems.find(item => item.product.itemId === selectedProduct.itemId);
  
    if (existingProduct) {
      // If the product already exists in the list, update its quantity and show a toast notification.
      handleQuantityChange(existingProduct.product.itemId, existingProduct.quantity + quantityToUse);
      setToastMessage(`Updated quantity of ${selectedProduct.name} to ${existingProduct.quantity + quantityToUse}`);
    } else {
      setPurchaseOrderItems(prevItems => [
        ...prevItems,
        {
          product: selectedProduct,
          quantity: quantityToUse
        }
      ]);
    }
  
    setSelectedQuantity('');
    setSelectedProduct(null);
    setSearchInput('');
  };
  
  const resetFlowCache = async () => {
    try {
      const response = await fetch('/api/resetFlow', {
        method: 'POST',
      });
  
      const responseData = await response.json();
      setToastMessage(responseData.message);
    } catch (error) {
      console.error("Error resetting flow:", error);
      setToastMessage("Error resetting the flow.");
    }
  };

  // To auto-hide the toast after a certain duration (e.g., 3 seconds)
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const calculateLineItemTotal = (price, quantity) => {
    const quantityToUse = quantity ? parseInt(quantity, 10) : 0;
    return (price && quantity) ? parseFloat((price * quantityToUse).toFixed(2)) : 0;
  };

  const calculateSubtotal = () => {
    const subtotal = purchaseOrderItems.reduce((total, item) => total + calculateLineItemTotal(item.product.price, item.quantity), 0);
    return parseFloat(subtotal.toFixed(2));
  };

  const createPurchaseOrderAPI = async (orderData) => {
    const response = await fetch('/api/createPurchaseOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
  
    if (!response.ok) {
      throw new Error('Failed to create the purchase order.');
    }
    
    return await response.json();
  };

  const handleSubmit = async (e) => {
    setIsLoading(true);
    e.preventDefault();
  
    const dateStr = e.target.date.value;
  
    const [year, month, day] = dateStr.split("-");
    let formattedDate = `${month}-${day}-${year}`;
    
    // Calculate subtotal before submitting
    const subtotal = calculateSubtotal();
  
    const orderData = {
      date: formattedDate,
      clientName: e.target.clientName.value,
      address: e.target.address.value,
      city: e.target.city.value,
      state: e.target.state.value,
      zip: e.target.zip.value,
      orderItems: purchaseOrderItems,
      subtotal: subtotal
    };

    try {
      const apiResponse = await createPurchaseOrderAPI(orderData);
  
      if (apiResponse) {
        // Check if the URL is valid and then redirect
        const embedUrl = encodeURIComponent(apiResponse);
        if (embedUrl) {
          router.push(`/embed?url=${embedUrl}`);
        } else {
          throw new Error("The embedded URL is invalid.");
        }
      } else {
        setToastMessage("Purchase Order created, but no embedded URL provided.");
      }
    } catch (error) {
      setToastMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formInputClasses = "appearance-none border focus:outline-none focus:shadow-outline leading-tight px-3 py-2 rounded shadow text-gray-700 w-full";
  const labelClasses = "block text-gray-700 text-sm font-bold mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Toast message={toastMessage} />

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-lg">
        <h1 className="text-2xl mb-3">Purchase Order</h1>

        <div className="mb-4">
          <label className={labelClasses} htmlFor="date">
            Date
          </label>
          <input 
            type="date" 
            name="date"
            id="date"
            className={formInputClasses}
            defaultValue={today}
          />
        </div>

        <div className="mb-4">
          <label className={labelClasses} htmlFor="clientName">
            Client Name
          </label>
          <input 
            type="text" 
            name="clientName"
            id="clientName"
            className={formInputClasses}
          />
        </div>

        <div className="mb-4">
          <label className={labelClasses} htmlFor="address">
            Address
          </label>
          <input 
            type="text" 
            name="address"
            id="address"
            className={formInputClasses}
          />
        </div>

        <div className="flex -mx-2">
          <div className="md:w-1/2 px-2 mb-4">
            <label className={labelClasses} htmlFor="city">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              className={formInputClasses}
            />
          </div>

          <div className="w-1/4 px-2 mb-4">
            <label className={labelClasses} htmlFor="state">
              State
            </label>
            <input
              type="text"
              name="state"
              id="state"
              className={formInputClasses}
            />
          </div>

          <div className="md:w-1/4 px-2 mb-4">
            <label className={labelClasses} htmlFor="zip">
              Zip Code
            </label>
            <input
              type="text"
              name="zip"
              id="zip"
              className={formInputClasses}
            />
          </div>
        </div>

        <div className="flex -mx-2">
          <div className="md:w-1/2 px-2 mb-4">
            <label className={labelClasses} htmlFor="product">
              Product
            </label>
            <ProductAutocomplete 
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              products={products}
              setSelectedProduct={setSelectedProduct}
            />
          </div>

          <div className="w-1/4 px-2 mb-4">
            <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-2">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              value={selectedQuantity}
              onChange={handleSelectedQuantityChange}
              className={formInputClasses}
            />
            
          </div>

          <div className="w-1/4 px-2 mb-4 flex flex-col justify-end">
            <label aria-hidden="true" className={labelClasses}>
              &nbsp;
            </label>
            <button
              type="button"
              onClick={handleAddProduct}
              className="ml-4 px-4 py-2 border border-blue-500 text-blue-500 bg-transparent rounded-md hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:bg-blue-100 focus:text-blue-600"
            >
              Add to Order
            </button>
          </div>
        </div>

        {purchaseOrderItems.length > 0 && (
          <table className="min-w-full bg-white border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 border-b">Item #</th>
                <th className="text-left py-2 px-3 border-b">Product</th>
                <th className="text-left py-2 px-3 border-b">Qty</th>
                <th className="text-left py-2 px-3 border-b">Price</th>
                <th className="text-left py-2 px-3 border-b">Amount</th>
              </tr>
            </thead>
            <tbody>
            {purchaseOrderItems.map((item) => (
                      <tr key={item.product.itemId}>
                        <td className="py-2 px-3 border-b">{item.product.itemId || ''}</td>
                        <td className="py-2 px-3 border-b">{item.product.name}</td>
                        <td className="py-2 px-3 border-b">
                          <input 
                            type="number" 
                            value={item.quantity || 0}
                            onChange={(e) => handleQuantityChange(item.product.itemId, Number(e.target.value))}
                            className={formInputClasses}
                          />
                        </td>
                        <td className="py-2 px-3 border-b">${item.product.price}</td>
                        <td className="py-2 px-3 border-b text-right">${calculateLineItemTotal(item.product.price, item.quantity)}</td>
                    </tr>
                  ))}
              <tr>
                  <td className="py-2 px-3 border-b"></td>
                  <td className="py-2 px-3 border-b"></td>
                  <td className="py-2 px-3 border-b"></td>
                  <td className="py-2 px-3 border-b font-semibold text-gray-600">Subtotal</td>
                  <td className="py-2 px-3 border-b text-right">${calculateSubtotal()}</td>
              </tr>
            </tbody>
          </table>
        )}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={resetFlowCache}
          className="px-4 py-2 mr-4 border-2 border-red-500 text-red-500 hover:bg-red-100 rounded-md focus:outline-none focus:bg-red-100 focus:text-red-600"
        >
          Reset&nbsp;Flow
        </button>
        <input 
          type="submit" 
          value={isLoading ? "Submitting..." : "Submit Purchase Order"} 
          className={`w-full px-6 py-2 text-white bg-blue-500 rounded-lg focus:outline-none ${isLoading ? 'cursor-not-allowed' : 'hover:bg-blue-600 cursor-pointer'}`} 
          disabled={isLoading}
        />
      </div>
    </form>
  </div>
  );
}
