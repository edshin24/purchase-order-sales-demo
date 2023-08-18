import { useState, useEffect } from "react";

const ProductAutocomplete = ({ searchInput, setSearchInput, products, setSelectedProduct }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    if (searchInput) {
        const matchedProducts = products.filter(product =>
            product.name.toLowerCase().includes(searchInput.toLowerCase())
        );
        setFilteredProducts(matchedProducts);
    } else {
        setFilteredProducts(products);
    }
  }, [searchInput, products]);

  const handleSuggestionClick = (product) => {
    setSearchInput(product.name);
    setShowSuggestions(false);
    setSelectedProduct(product);  // Update the parent state directly
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" && highlightedIndex < filteredProducts.length - 1) {
      setHighlightedIndex(highlightedIndex + 1);
    } else if (e.key === "ArrowUp" && highlightedIndex > 0) {
      setHighlightedIndex(highlightedIndex - 1);
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      handleSuggestionClick(filteredProducts[highlightedIndex]);
    }
  };

  return (
    <div className="relative z-50">
      <input
        type="text"
        name="product"
        id="product"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        autoComplete="off"
        className="shadow appearance-none border w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
      {showSuggestions && (
        <ul className="absolute top-full mt-2 w-full bg-white border border-gray-300 divide-y divide-gray-300 rounded-md">
          {filteredProducts.map((product, index) => (
            <li
              key={product.itemId}
              className={`p-2 hover:bg-gray-200 cursor-pointer ${highlightedIndex === index ? "bg-gray-200" : ""}`}
              onClick={() => handleSuggestionClick(product)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {product.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductAutocomplete;
