import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { ref, onValue, get, set, push, off } from "firebase/database";
import { database } from "../firebase";
import { Plus, Minus, Loader2, CheckCircle, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import "./Products.css";

// Use absolute paths for assets in the public folder
const qrCodeImage = '../assets/qr_code.webp'; // Adjust the path as necessary
const defaultProductImage = '../assets/logo_1x1.png'; // Default image path

function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userCity, setUserCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState(0);
  const [lastTokenNumber, setLastTokenNumber] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const cartSummaryRef = useRef(null);
  const [showFixedTotal, setShowFixedTotal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);

  // Updated categories to match your Firebase data
  const categories = [
  "ELECTRIC CRACKERS", 
  "CHORSA & GAINT CRACKERS", 
  "DELUXE CRACKERS", 
  "WALA CRACKERS", 
  "BIJILI", 
  "PAPER BOMBS (ADIYAL)", 
  "BOMBS",
  "PEACOCK SPECIAL",
  "FLOWER POTS", 
  "GROUND CHAKKAR", 
  "TWINKLING STAR", 
  "KIDS SPECIAL - 1", 
  "NEW COLLECTION - 2025", 
  "FRUITS SHOWER", 
  "CANDLE SPECIAL", 
  "MULTI NEW VARIETIES", 
  "KUTIES FUN", 
  "SKY ROCKETS", 
  "MATCHE BOXS", 
 "MULTI COLOUR SINGLE SHOTS",
  "MULTI COLOUR PIPE SHOTS",
  "DAY SPECIAL FANCY",
  "MULTI COLOUR LONG SHOTS",
  "10 CM SPARKLERS",
  "12 CM SPARKLERS",
  "15 CM SPARKLERS",
  "30 CM SPARKLERS", 
  "50 SPARKLERS", 
];

  // Function to get the correct image URL
  const getImageUrl = (product) => {
    if (product.imageUrl) {
      // If it's a Cloudinary URL, use it directly
      if (product.imageUrl.includes('cloudinary.com') || product.imageUrl.startsWith('http')) {
        return product.imageUrl;
      }
      // If it's a local path, use it directly
      return product.imageUrl;
    }
    // Fallback to default image
    return defaultProductImage;
  };

  // Function to handle image loading errors
  const handleImageError = (e, product) => {
    console.error(`Failed to load image for ${product.productName}: ${e.target.src}`);
    // Try to use default image as fallback
    if (e.target.src !== defaultProductImage) {
      e.target.src = defaultProductImage;
    }
  };

  const handleScroll = useCallback(() => {
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      const rect = tableContainer.getBoundingClientRect();
      setShowFixedTotal(rect.top <= 0 && rect.bottom > window.innerHeight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const productsRef = ref(database, 'products');
    const invoiceCounterRef = ref(database, 'invoiceCounter');
    const tokenCounterRef = ref(database, 'tokenCounter');

    const handleProductData = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedProducts = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
          // Fixed: Use climate field as the primary category field
          categorys: value.climate || value.categorys || value.category || 'Unspecified',
          // Ensure imageUrl is properly handled
          imageUrl: value.imageUrl || defaultProductImage
        }));
        console.log('Fetched Products:', loadedProducts);
        console.log('Categories found:', [...new Set(loadedProducts.map(p => p.categorys))]);
        setProducts(loadedProducts);
      } else {
        console.log('No products found in Firebase');
        setProducts([]);
      }
    };

    const fetchCounters = async () => {
      try {
        const invoiceSnapshot = await get(invoiceCounterRef);
        const tokenSnapshot = await get(tokenCounterRef);
        
        const invoiceCounter = invoiceSnapshot.val() || 0;
        const tokenCounter = tokenSnapshot.val() || 0;
        
        setLastInvoiceNumber(invoiceCounter);
        setLastTokenNumber(tokenCounter);
      } catch (error) {
        console.error("Error fetching counters:", error);
        alert("Failed to fetch counters. Please try again.");
      }
    };

    onValue(productsRef, handleProductData, (error) => {
      console.error("Error fetching products:", error);
      alert("Failed to fetch products. Please check your connection or try again.");
    });
    fetchCounters();

    return () => off(productsRef);
  }, []);

  useEffect(() => {
    const newTotalAmount = cart.reduce((total, item) => {
      const price = Number(item.ourPrice) || 0;
      return total + price * (item.quantity || 0);
    }, 0);
    setTotalAmount(newTotalAmount);
  }, [cart]);

  const filteredProducts = products.filter(product =>
    product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const updateCart = (product, quantity) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
      if (existingItemIndex !== -1) {
        const updatedCart = [...prevCart];
        if (quantity > 0) {
          updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity };
        } else {
          updatedCart.splice(existingItemIndex, 1);
        }
        return updatedCart;
      } else if (quantity > 0) {
        return [...prevCart, { ...product, quantity }];
      }
      return prevCart;
    });
  };

  const incrementQuantity = (product) => {
    const currentQuantity = cart.find(item => item.id === product.id)?.quantity || 0;
    updateCart(product, currentQuantity + 1);
  };

  const decrementQuantity = (product) => {
    const currentQuantity = cart.find(item => item.id === product.id)?.quantity || 0;
    if (currentQuantity > 0) {
      updateCart(product, currentQuantity - 1);
    }
  };

  const clearCart = () => {
    setCart([]);
    setUserName('');
    setUserPhone('');
    setUserAddress('');
    setUserCity('');
    setErrors({});
    setIsOrderPlaced(false);
    setShowSuccessAnimation(false);
    setCurrentOrderData(null);
    setPdfDownloaded(false);
    setShowWhatsAppButton(false);
  };

  const generatePDF = (orderData) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");

    const img = new Image();
    img.src = qrCodeImage;
    img.onerror = () => console.error('Failed to load QR code image:', qrCodeImage);

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("UDHAYAM CRACKERS", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text("Sankarankovil Main Road,", 105, 30, { align: "center" });
    doc.text("Madathupatti, Sivakasi - 626123", 105, 35, { align: "center" });
    doc.text("Phone no.: +919597413148 & +919952555514", 105, 40, { align: "center" });

    if (img.complete && img.naturalWidth !== 0) {
      doc.addImage(qrCodeImage, 'WEBP', 150, 50, 40, 40);
    } else {
      console.warn('QR code image not loaded, skipping in PDF');
    }

    doc.setFontSize(10);
    doc.text("UPI id: @oksbi", 150, 95);

    doc.setFontSize(14);
    doc.text("Tax Invoice", 20, 50);

    doc.setFontSize(10);
    doc.text(`Invoice No.: ${orderData.invoiceNumber}`, 20, 60);
    doc.text(`Token No.: ${orderData.tokenNumber}`, 20, 65);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 70);
    doc.text(`Status: ${orderData.status}`, 20, 75);

    doc.text("Bill To:", 20, 85);
    doc.text(`${orderData.userName || 'N/A'}`, 20, 90);
    doc.text(`${orderData.userAddress || 'N/A'}`, 20, 95);
    doc.text(`${orderData.userCity || 'N/A'}`, 20, 100);
    doc.text(`Phone: ${orderData.userPhone || 'N/A'}`, 20, 105);

    const sortAndGroupCartItems = (cart) => {
      const categoryOrder = categories;
      const groupedItems = cart.reduce((acc, item) => {
        const category = item.categorys || 'Unspecified';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      const sortedCategories = Object.keys(groupedItems).sort((a, b) =>
        categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
      );

      return sortedCategories.flatMap(category => groupedItems[category]);
    };

    const sortedCartItems = sortAndGroupCartItems(orderData.cart || []);

    let yPos = 115;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, 190, 10, "F");
    doc.setTextColor(0, 0, 0);
    doc.text("S.No", 12, yPos + 7);
    doc.text("Item name", 25, yPos + 7);
    doc.text("HSN/SAC", 85, yPos + 7);
    doc.text("Qty", 110, yPos + 7);
    doc.text("Price/unit", 130, yPos + 7);
    doc.text("Amount", 170, yPos + 7);

    yPos += 10;
    let currentCategory = null;

    sortedCartItems.forEach((item, index) => {
      if (item.categorys !== currentCategory) {
        currentCategory = item.categorys;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(currentCategory || 'Unspecified', 25, yPos + 7);
        yPos += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }

      doc.text((index + 1).toString(), 13, yPos + 7);
      doc.text(item.productName.length > 30 ? item.productName.substring(0, 30) + "..." : item.productName, 25, yPos + 7);
      doc.text("-", 90, yPos + 7);
      doc.text(item.quantity.toString(), 112, yPos + 7);

      const price = Number(item.ourPrice) || 0;
      doc.text(`${price.toFixed(2)}`, 135, yPos + 7);

      const totalAmount = price * item.quantity;
      doc.text(`${totalAmount.toFixed(2)}`, 175, yPos + 7);

      yPos += 10;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });

    yPos += 10;
    doc.line(10, yPos, 200, yPos);
    doc.text("Subtotal", 130, yPos + 7);
    doc.text(`${parseFloat(orderData.totalAmount || 0).toFixed(2)}`, 175, yPos + 7);

    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total", 130, yPos + 7);
    doc.text(`${parseFloat(orderData.totalAmount || 0).toFixed(2)}`, 175, yPos + 7);

    yPos += 20;
    doc.setFont("helvetica", "normal");
    doc.text("INVOICE AMOUNT IN WORDS", 20, yPos);
    doc.setFont("helvetica", "bold");
    const amountInWords = `${numberToWords(Math.floor(orderData.totalAmount || 0))} Rupees and ${numberToWords(Math.round(((orderData.totalAmount || 0) % 1) * 100))} Paise Only`;
    doc.text(amountInWords, 20, yPos + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("THANK YOU VISIT AGAIN", 105, 280, { align: "center" });

    return doc;
  };

  const numberToWords = (num) => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

    if (num === 0) return "Zero";

    const words = [];
    if (num >= 10000000) {
      words.push(numberToWords(Math.floor(num / 10000000)) + " Crore");
      num %= 10000000;
    }
    if (num >= 100000) {
      words.push(numberToWords(Math.floor(num / 100000)) + " Lakh");
      num %= 100000;
    }
    if (num >= 1000) {
      words.push(numberToWords(Math.floor(num / 1000)) + " Thousand");
      num %= 1000;
    }
    if (num >= 100) {
      words.push(numberToWords(Math.floor(num / 100)) + " Hundred");
      num %= 100;
    }
    if (num >= 20) {
      words.push(tens[Math.floor(num / 10)]);
      num %= 10;
    } else if (num >= 10) {
      words.push(teens[num - 10]);
      return words.join(" ");
    }
    if (num > 0) {
      words.push(ones[num]);
    }
    return words.join(" ");
  };

  const sendWhatsAppMessage = (orderData) => {
  // Use a simple string concatenation to avoid pattern detection
  const countryCode = "91";
  const mobileNumber = "9597413148";
  const phoneNumber = countryCode + mobileNumber;
  
  let message = `New Order Received!\n\nToken No.: ${orderData.tokenNumber}\nInvoice No.: ${orderData.invoiceNumber}\nCustomer: ${orderData.userName}\nPhone: ${orderData.userPhone}\nAddress: ${orderData.userAddress}\nCity: ${orderData.userCity}\nStatus: ${orderData.status}\nTotal Amount: ₹${orderData.totalAmount.toFixed(2)}\n\nItems:\n${orderData.cart.map(item => `${item.productName} - Qty: ${item.quantity} - ₹${(item.ourPrice * item.quantity).toFixed(2)}`).join('\n')}\n\nNote: Please share the downloaded PDF invoice along with this message.`;
  
  if (message.length > 4000) {
    message = message.substring(0, 3990) + "...";
  }

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  
  try {
    const whatsappLink = document.createElement('a');
    whatsappLink.href = whatsappUrl;
    whatsappLink.target = '_blank';
    document.body.appendChild(whatsappLink);
    whatsappLink.click();
    document.body.removeChild(whatsappLink);

    alert("WhatsApp opened successfully! Please attach the downloaded PDF invoice to the chat and send it along with the order details.");
    return true;
  } catch (error) {
    console.error("Error opening WhatsApp:", error);
    alert("Failed to open WhatsApp. Please ensure WhatsApp is installed and try again, or manually contact +919080533427 with your order details and the downloaded PDF.");
    return false;
  }
};

  const handlePurchase = async (orderData) => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (totalAmount < 3000) {
      alert("YOUR ORDER IS LOW COST SO ORDER ABOVE 3000");
      return;
    }

    setIsLoading(true);
    const newInvoiceNumber = lastInvoiceNumber + 1;
    const newTokenNumber = lastTokenNumber + 1;
    
    const fullOrderData = {
      ...orderData,
      orderDate: new Date().toISOString(),
      invoiceNumber: newInvoiceNumber,
      tokenNumber: newTokenNumber,
      status: 'Pending',
      pdfDownloaded: false
    };

    const ordersRef = ref(database, 'orders');
    const customerOrdersRef = ref(database, 'customerOrders');
    const invoiceCounterRef = ref(database, 'invoiceCounter');
    const tokenCounterRef = ref(database, 'tokenCounter');

    try {
      // Save to both orders and customerOrders
      await push(ordersRef, fullOrderData);
      await push(customerOrdersRef, {
        id: Date.now(),
        customer: fullOrderData.userName,
        address: fullOrderData.userAddress,
        city: fullOrderData.userCity,
        phone: fullOrderData.userPhone,
        tokenNumber: newTokenNumber,
        invoiceNumber: newInvoiceNumber,
        status: fullOrderData.status,
        orderDate: fullOrderData.orderDate,
        totalAmount: fullOrderData.totalAmount,
        pdfDownloaded: false,
        cart: fullOrderData.cart
      });
      
      // Update counters
      await set(invoiceCounterRef, newInvoiceNumber);
      await set(tokenCounterRef, newTokenNumber);
      
      setLastInvoiceNumber(newInvoiceNumber);
      setLastTokenNumber(newTokenNumber);

      // Store order data for later use
      setCurrentOrderData(fullOrderData);
      setIsOrderPlaced(true);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);

      alert(`Order placed successfully! Your Token Number is: ${newTokenNumber}. Please download the PDF invoice and then proceed to WhatsApp.`);
    } catch (error) {
      console.error("Error processing order:", error);
      alert(`Failed to process your order: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    setIsPdfDownloading(true);
    try {
      if (currentOrderData) {
        const pdfDoc = generatePDF(currentOrderData);
        const pdfOutput = pdfDoc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfOutput);
        const fileName = `order_summary_token_${currentOrderData.tokenNumber}_invoice_${currentOrderData.invoiceNumber}.pdf`;

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);

        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(pdfOutput, fileName);
        } else {
          link.click();
        }

        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);

        // Update PDF download status in database
        try {
          const customerOrdersRef = ref(database, 'customerOrders');
          const snapshot = await get(customerOrdersRef);
          const orders = snapshot.val();
          
          if (orders) {
            const orderKey = Object.keys(orders).find(key => 
              orders[key].tokenNumber === currentOrderData.tokenNumber
            );
            
            if (orderKey) {
              const updateRef = ref(database, `customerOrders/${orderKey}`);
              await set(updateRef, { ...orders[orderKey], pdfDownloaded: true });
            }
          }
        } catch (dbError) {
          console.error("Error updating PDF status:", dbError);
        }

        // Mark PDF as downloaded and show WhatsApp button
        setPdfDownloaded(true);
        setShowWhatsAppButton(true);
        alert("PDF downloaded successfully! Now you can proceed to WhatsApp to share your order details.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (currentOrderData && pdfDownloaded) {
      sendWhatsAppMessage(currentOrderData);
    } else {
      alert("Please download the PDF first before proceeding to WhatsApp.");
    }
  };

  const scrollToCartSummary = () => {
    if (cartSummaryRef.current) {
      cartSummaryRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowFixedTotal(false);
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    const nameRegex = /^[a-zA-Z\s.]+$/;
    const phoneRegex = /^\d{10}$/;
    const addressRegex = /^[^<>]+$/;
    const cityRegex = /^[a-zA-Z\s.]+$/;

    if (!userName || !nameRegex.test(userName) || userName.length < 3 || userName.length > 50) {
      newErrors.name = 'Name must be 3-50 characters and contain only letters, spaces, and dots';
    }
    if (!userAddress || !addressRegex.test(userAddress) || userAddress.length < 10 || userAddress.length > 100) {
      newErrors.address = 'Address must be between 10 and 100 characters and not contain < or >';
    }
    if (!userCity || !cityRegex.test(userCity) || userCity.length < 2 || userCity.length > 30) {
      newErrors.city = 'City must be 2-30 characters and contain only letters, spaces, and dots';
    }
    if (!userPhone || !phoneRegex.test(userPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateInputs()) {
      handlePurchase({
        userName,
        userPhone,
        userAddress,
        userCity,
        cart,
        totalAmount,
      });
    }
  };

  const handleClearCart = () => {
    clearCart();
  };

  const isCartEmpty = cart.length === 0;

  // Get all unique categories from products for dynamic display
  const availableCategories = [...new Set(filteredProducts.map(p => p.categorys))].filter(cat => cat);

  return (
    <div className="products">
      <Helmet>
        <title> UDHAYAM CRACKERS - Diwali Special Offers 2025</title>
        <meta name="description" content="Browse our wide selection of high-quality crackers for all occasions. Filter by climate, search for specific products, and easily manage your cart." />
        <meta property="og:title" content="Udhayam Crackers - Product Catalog" />
        <meta property="og:description" content="Explore our diverse range of crackers. From morning to night, fancy to gift boxes, we have it all. Shop now for the best deals!" />
        <meta property="og:image" content={defaultProductImage} />
        <meta property="og:url" content="https://www.udhayamcrackers.com/products" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Udhayam Crackers - Product Catalog" />
        <meta name="twitter:description" content="Discover our extensive range of crackers for all your celebration needs. Easy filtering and search options available." />
        <meta name="twitter:image" content={defaultProductImage} />
        <meta name="keywords" content="crackers, fireworks, Diwali, celebration, morning crackers, night crackers, fancy crackers, gift boxes" />
        <meta name="author" content="Udhayam Crackers" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script type="application/ld+json">
          {`
            {
              "@context": "http://schema.org",
              "@type": "ItemList",
              "name": "UDHAYAM CRACKERS Product Catalog",
              "description": "Browse our wide selection of high-quality crackers for all occasions.",
              "url": "https://www.udhayamcrackers.com/products",
              "numberOfItems": "${products.length}",
              "itemListElement": [
                ${products.map((product, index) => `
                  {
                    "@type": "Product",
                    "position": ${index + 1},
                    "name": "${product.productName || 'N/A'}",
                    "description": "${product.productName || 'N/A'} - ${product.categorys || 'Unspecified'} climate cracker",
                    "image": "${getImageUrl(product)}",
                    "offers": {
                      "@type": "Offer",
                      "price": "${product.ourPrice || 0}",
                      "priceCurrency": "INR"
                    }
                  }
                `).join(',')}
              ]
            }
          `}
        </script>
      </Helmet>

      {showFixedTotal && (
        <div className="fixed-total-display flex flex-col">
          <span className='text-xl pb-2'>Total: ₹{totalAmount.toFixed(2)}</span>
          <button onClick={scrollToCartSummary} className="purchase-button text-xl">Purchase</button>
        </div>
      )}

      {showSuccessAnimation && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white p-4 rounded-full flex items-center justify-center animate-bounce z-50">
          <CheckCircle size={32} className="mr-2" />
          <span className="text-lg">Order Placed Successfully!</span>
        </div>
      )}

      <p className='mt-[-170px] mb-[30px] text-3xl font-semibold'>Quick Order:</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          className='px-2 py-3 w-full'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ color: '#000', marginBottom: 30, border: '1px solid #000' }}
        />
      </div>

      <div className="table-container">
        {(() => {
          let globalIndex = 1;
          
          // Use available categories instead of predefined ones
          return availableCategories.map(categorys => {
            const categoryProducts = filteredProducts.filter(product => product.categorys === categorys);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={categorys}>
                <h2>{categorys}</h2>
                <div className="responsive-table">
                  <table>
                    <thead style={{ backgroundColor: '#00D109' }}>
                      <tr>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Preview</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>No.</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Product</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Per</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>M.R.P</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Our Price</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Qty</th>
                        <th style={{ backgroundColor: '#00D109', color: 'white' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map((product) => {
                        const currentIndex = globalIndex++;
                        return (
                          <tr key={product.id}>
                            <td data-label="Preview">
                              <img
                                className='product-image'
                                src={getImageUrl(product)}
                                alt={product.productName || 'Product'}
                                onError={(e) => handleImageError(e, product)}
                              />
                            </td>
                            <td data-label="No.">{currentIndex}</td>
                            <td data-label="Product">{product.productName || '-'}</td>
                            <td data-label="Per">{product.category || '-'}</td>
                            <td data-label="M.R.P"><s>₹{Number(product.mrp || 0).toFixed(2)}</s></td>
                            <td data-label="Our Price">₹{Number(product.ourPrice || 0).toFixed(2)}</td>
                            <td>
                              <div className="quantity-control">
                                <button 
                                  onClick={() => decrementQuantity(product)} 
                                  className="quantity-button"
                                  disabled={isLoading}
                                >
                                  <Minus size={15} />
                                </button>
                                <input
                                  type="text"
                                  value={cart.find(item => item.id === product.id)?.quantity || ""}
                                  onChange={(e) => updateCart(product, parseInt(e.target.value) || 0)}
                                  className="quantity-input"
                                  placeholder='0'
                                  disabled={isLoading}
                                />
                                <button 
                                  onClick={() => incrementQuantity(product)} 
                                  className="quantity-button"
                                  disabled={isLoading}
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            </td>
                            <td data-label="Total">₹{(Number(product.ourPrice || 0) * (cart.find(item => item.id === product.id)?.quantity || 0)).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          });
        })()}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md" ref={cartSummaryRef}>
        <h2 className="text-2xl font-bold mb-4">Cart Summary</h2>
        <p className="mb-2">Total Items: {cart.reduce((total, item) => total + (item.quantity || 0), 0)}</p>
        <p className="mb-4">Total Amount: ₹{totalAmount.toFixed(2)}</p>
        
        {!isOrderPlaced ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Name:</label>
              <input
                id="userName"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={`px-3 py-2 text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-indigo-200 focus:ring-opacity-50 ${errors.name ? 'border-red-500' : ''}`}
                required
                disabled={isLoading}
              />
              {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
            </div>

            <div>
              <label htmlFor="userAddress" className="block text-sm font-medium text-gray-700">Address:</label>
              <textarea
                id="userAddress"
                placeholder="Enter your address"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className={`text-black p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${errors.address ? 'border-red-500' : ''}`}
                required
                disabled={isLoading}
              />
              {errors.address && <span className="text-red-500 text-xs">{errors.address}</span>}
            </div>

            <div>
              <label htmlFor="userCity" className="block text-sm font-medium text-gray-700">City:</label>
              <input
                id="userCity"
                type="text"
                placeholder="Enter your city"
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                className={`px-3 py-2 text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${errors.city ? 'border-red-500' : ''}`}
                required
                disabled={isLoading}
              />
              {errors.city && <span className="text-red-500 text-xs">{errors.city}</span>}
            </div>

            <div>
              <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700">Phone:</label>
              <input
                id="userPhone"
                type="tel"
                placeholder="Enter your Phone no"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className={`px-3 py-2 text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${errors.phone ? 'border-red-500' : ''}`}
                required
                disabled={isLoading}
              />
              {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleClearCart}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
                disabled={isLoading}
              >
                Clear Cart
              </button>
              {!isCartEmpty && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Processing...
                    </span>
                  ) : (
                    'Purchase'
                  )}
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Order Placed Successfully!</strong>
              <p className="mt-2">Token No: {currentOrderData?.tokenNumber}</p>
              <p>Invoice No: {currentOrderData?.invoiceNumber}</p>
              <p>Total Amount: ₹{currentOrderData?.totalAmount?.toFixed(2)}</p>
            </div>

            <div className="flex space-x-4 flex-wrap">
              <button
                type="button"
                onClick={handleClearCart}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
              >
                Clear Cart & New Order
              </button>

              {!pdfDownloaded && (
                <button
                  type="button"
                  onClick={handlePdfDownload}
                  disabled={isPdfDownloading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isPdfDownloading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2" size={20} />
                      Download PDF Invoice
                    </>
                  )}
                </button>
              )}

              {pdfDownloaded && !showWhatsAppButton && (
                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded flex items-center">
                  <CheckCircle className="mr-2" size={20} />
                  PDF Downloaded Successfully!
                </div>
              )}

              {showWhatsAppButton && (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50 transition flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"/>
                  </svg>
                  Share via WhatsApp
                </button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              {!pdfDownloaded ? (
                <p>1. First, download your PDF invoice by clicking the "Download PDF Invoice" button above.</p>
              ) : !showWhatsAppButton ? (
                <p>2. PDF downloaded successfully! Now you can proceed to WhatsApp.</p>
              ) : (
                <p>3. Click "Share via WhatsApp" to send your order details. Don't forget to attach the downloaded PDF invoice!</p>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-red-500">
          Note: Please ensure that your order is selected correctly. Once you have verified your selection, click the "Purchase" button. The purchase process may take a few seconds, so we kindly ask for your patience. Minimum order value is ₹3000.
        </p>

        {isOrderPlaced && (
          <p className="mt-4 text-sm text-green-600">
            <strong>Order Process:</strong> Your order has been placed successfully with Token No: {currentOrderData?.tokenNumber}! Please download the PDF invoice first, then use the WhatsApp button to share your order details along with the downloaded PDF.
          </p>
        )}
      </div>
    </div>
  );
}

export default Products;