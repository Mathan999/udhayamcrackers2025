import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { ref, get, set } from "firebase/database";
import { database, firestore, auth } from "../firebase";
import { collection, addDoc, onSnapshot, getDocs, query, where, updateDoc, doc, enableNetwork, disableNetwork } from "firebase/firestore";
import { Plus, Minus, Loader2, CheckCircle, Download, AlertCircle } from "lucide-react";
import { jsPDF } from "jspdf";
import "./Products.css";

const qrCodeImage = 'https://res.cloudinary.com/dirbsbdfh/image/upload/v1758038640/1000252086_h7oufe.jpg';
const defaultProductImage = '../assets/logo_1x1.png';

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
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const categories = [
    "ONE SOUND CRACKERS",
    "CHROSA & GIANT CRACKERS",
    "DELUXE CRACKERS",
    "WALA SPECIAL",
    "UDHAYAM CRACKERS THALA DIWALI SPECIAL",
    "BIJILI CRACKERS",
    "ATOM BOMBS",
    "FLOWER POTS",
    "GROUND CHAKKAR",
    "CHILDREN COLLECTIONS",
    "FOUNTAIN ITEMS",
    "PARTY CELEBRATION - 2025 SPECIAL",
    "CRACKLING FOUNTAIN",
    "ROCKET",
    "TWINKLING STAR",
    "CANDEL COLLECTION",
    "FANCY SINGLE SHOTS",
    "FANCY CONTINIOUS SHOTS",
    "COLOUR MATCHES",
    "SPARKLERS",
    "GIFT BOX - NO DISCOUNT"
  ];

  const getImageUrl = (product) => {
    if (product.imageUrl) {
      if (product.imageUrl.includes('cloudinary.com') || product.imageUrl.startsWith('http')) {
        return product.imageUrl;
      }
      return product.imageUrl;
    }
    return defaultProductImage;
  };

  const handleImageError = (e, product) => {
    console.error(`Image load error for ${product.productName || 'Unknown'}: ${e.target.src}`);
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

  // Enhanced retry mechanism for Firebase connection
  const retryFirebaseOperation = async (operation, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await enableNetwork(firestore);
        const result = await operation();
        setConnectionError(null);
        return result;
      } catch (error) {
        console.error(`Firebase operation failed (attempt ${i + 1}):`, error);
        setConnectionError(error.message);
        
        if (i === maxRetries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  // Enhanced product loading with better error handling
  const loadProducts = useCallback(async () => {
    setIsProductLoading(true);
    setConnectionError(null);

    try {
      await retryFirebaseOperation(async () => {
        const productsCollection = collection(firestore, 'products');
        
        // Try direct query first
        const snapshot = await getDocs(productsCollection);
        console.log('Direct query result:', snapshot.size, 'documents');
        
        if (snapshot.empty) {
          console.warn("No products found in Firestore 'products' collection");
          
          // Check if it's an authentication issue
          if (!auth.currentUser) {
            console.log("User not authenticated, attempting anonymous access");
          }
          
          setProducts([]);
          throw new Error("No products found. This might be due to security rules or collection name mismatch.");
        } else {
          const loadedProducts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              categorys: data.climate || data.categorys || data.category || 'Unspecified',
              imageUrl: data.imageUrl || defaultProductImage,
              categoryPosition: data.categoryPosition || 1
            };
          });
          
          console.log('Successfully loaded products:', loadedProducts.length);
          setProducts(loadedProducts);
        }
      });
    } catch (error) {
      console.error("Product loading error:", error);
      setConnectionError(`Failed to load products: ${error.message}`);
      
      // Try alternative collection names
      if (retryCount < 2) {
        console.log("Trying alternative collection names...");
        setRetryCount(prev => prev + 1);
        
        try {
          const alternativeCollections = ['product', 'Product', 'PRODUCTS'];
          for (const collectionName of alternativeCollections) {
            try {
              const altCollection = collection(firestore, collectionName);
              const altSnapshot = await getDocs(altCollection);
              if (!altSnapshot.empty) {
                console.log(`Found products in '${collectionName}' collection`);
                const loadedProducts = altSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  categorys: doc.data().climate || doc.data().categorys || doc.data().category || 'Unspecified',
                  imageUrl: doc.data().imageUrl || defaultProductImage,
                  categoryPosition: doc.data().categoryPosition || 1
                }));
                setProducts(loadedProducts);
                setConnectionError(null);
                break;
              }
            } catch (altError) {
              console.log(`Collection '${collectionName}' not found or accessible`);
            }
          }
        } catch (altError) {
          console.error("Alternative collection search failed:", altError);
        }
      }
    } finally {
      setIsProductLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    // Load products
    loadProducts();

    // Load counters with retry mechanism
    const loadCounters = async () => {
      try {
        await retryFirebaseOperation(async () => {
          const invoiceCounterRef = ref(database, 'invoiceCounter');
          const tokenCounterRef = ref(database, 'tokenCounter');
          
          const invoiceSnapshot = await get(invoiceCounterRef);
          const tokenSnapshot = await get(tokenCounterRef);
          const invoiceCounter = invoiceSnapshot.val() || 0;
          const tokenCounter = tokenSnapshot.val() || 0;
          
          console.log("Counters loaded successfully:", { invoiceCounter, tokenCounter });
          setLastInvoiceNumber(invoiceCounter);
          setLastTokenNumber(tokenCounter);
        });
      } catch (error) {
        console.error("Counter loading error:", error);
        // Use default values if counters can't be loaded
        setLastInvoiceNumber(1000);
        setLastTokenNumber(1000);
      }
    };

    loadCounters();
  }, [loadProducts]);

  // Real-time listener with enhanced error handling
  useEffect(() => {
    if (products.length > 0) return; // Don't set up listener if products already loaded

    let unsubscribe;
    
    const setupRealtimeListener = async () => {
      try {
        await enableNetwork(firestore);
        const productsCollection = collection(firestore, 'products');
        
        unsubscribe = onSnapshot(
          productsCollection, 
          (snapshot) => {
            console.log('Real-time update received, documents:', snapshot.size);
            if (!snapshot.empty) {
              const loadedProducts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  categorys: data.climate || data.categorys || data.category || 'Unspecified',
                  imageUrl: data.imageUrl || defaultProductImage,
                  categoryPosition: data.categoryPosition || 1
                };
              });
              setProducts(loadedProducts);
              setConnectionError(null);
              setIsProductLoading(false);
            }
          },
          (error) => {
            console.error("Real-time listener error:", error);
            setConnectionError(`Real-time updates failed: ${error.message}`);
            // Fallback to direct loading
            loadProducts();
          }
        );
      } catch (error) {
        console.error("Failed to setup real-time listener:", error);
        // Fallback to direct loading
        loadProducts();
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [products.length, loadProducts]);

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
    if (!auth.currentUser) {
      alert("Please log in to modify the cart");
      return;
    }
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
    if (!auth.currentUser) {
      alert("Please log in to clear the cart");
      return;
    }
    if (window.confirm("Are you sure you want to clear the cart?")) {
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
      console.log("Cart cleared by user:", auth.currentUser.uid);
    }
  };

  // Rest of the component methods remain the same...
  const generatePDF = (orderData) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("UDHAYAM CRACKERS", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text("Sankarankovil Main Road,", 105, 30, { align: "center" });
    doc.text("Madathupatti, Sivakasi - 626123", 105, 35, { align: "center" });
    doc.text("Phone no.: +919597413148 & +919952555514", 105, 40, { align: "center" });

    try {
      doc.addImage(qrCodeImage, 'JPEG', 150, 50, 40, 40);
      console.log('QR code added to PDF');
    } catch (error) {
      console.error('QR code error:', error.message);
    }

    doc.setFontSize(10);
    doc.text("UPI id: muthukumarm@oksbi", 150, 95);

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
    let itemIndex = 1;

    sortedCartItems.forEach((item) => {
      if (item.categorys !== currentCategory) {
        currentCategory = item.categorys;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(currentCategory || 'Unspecified', 25, yPos + 7);
        yPos += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }

      doc.text(itemIndex.toString(), 13, yPos + 7);
      doc.text(item.productName && item.productName.length > 30 ? 
        item.productName.substring(0, 30) + "..." : 
        item.productName || 'Unknown Product', 25, yPos + 7);
      doc.text("-", 90, yPos + 7);
      doc.text((item.quantity || 0).toString(), 112, yPos + 7);

      const price = Number(item.ourPrice) || 0;
      doc.text(`${price.toFixed(2)}`, 135, yPos + 7);

      const totalAmount = price * (item.quantity || 0);
      doc.text(`${totalAmount.toFixed(2)}`, 175, yPos + 7);

      yPos += 10;
      itemIndex++;

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
    if (!auth.currentUser) {
      console.warn("Unauthorized WhatsApp share attempt");
      alert("Please log in to share via WhatsApp");
      return;
    }

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
      console.log("WhatsApp message opened for order:", orderData.tokenNumber);
      alert("WhatsApp opened successfully! Please attach the downloaded PDF invoice.");
      return true;
    } catch (error) {
      console.error("WhatsApp error:", error.message);
      alert("Failed to open WhatsApp: " + error.message);
      return false;
    }
  };

  const handlePurchase = async (orderData) => {
    if (!auth.currentUser) {
      console.warn("Unauthorized purchase attempt");
      alert("Please log in to place an order");
      return;
    }

    if (cart.length === 0) {
      console.log("Empty cart");
      alert("Your cart is empty!");
      return;
    }

    if (totalAmount < 3000) {
      console.log("Total amount too low:", totalAmount);
      alert("YOUR ORDER IS LOW COST SO ORDER ABOVE ₹3000");
      return;
    }

    if (!orderData.userName || !orderData.userAddress || !orderData.userCity || !orderData.userPhone) {
      console.log("Incomplete order data:", orderData);
      alert("Please fill in all customer information");
      return;
    }

    setIsLoading(true);
    const newInvoiceNumber = lastInvoiceNumber + 1;
    const newTokenNumber = lastTokenNumber + 1;
    
    const fullOrderData = {
      ...orderData,
      orderDate: new Date().toISOString(),
      invoiceNumber: newInvoiceNumber,
      tokenNumber: newTokenNumber.toString(),
      status: 'Pending',
      pdfDownloaded: false,
      userId: auth.currentUser.uid
    };

    console.log("Attempting to save order:", fullOrderData);

    try {
      await retryFirebaseOperation(async () => {
        const invoiceCounterRef = ref(database, 'invoiceCounter');
        const tokenCounterRef = ref(database, 'tokenCounter');
        const ordersCollection = collection(firestore, 'orders');
        const customerOrdersCollection = collection(firestore, 'customerOrders');
        
        const orderDocRef = await addDoc(ordersCollection, fullOrderData);
        console.log("Order saved with ID:", orderDocRef.id);
        
        const customerOrderDocRef = await addDoc(customerOrdersCollection, {
          id: Date.now(),
          customer: fullOrderData.userName,
          address: fullOrderData.userAddress,
          city: fullOrderData.userCity,
          phone: fullOrderData.userPhone,
          tokenNumber: newTokenNumber.toString(),
          invoiceNumber: newInvoiceNumber,
          status: fullOrderData.status,
          orderDate: fullOrderData.orderDate,
          totalAmount: fullOrderData.totalAmount,
          pdfDownloaded: false,
          cart: fullOrderData.cart,
          userId: auth.currentUser.uid
        });
        console.log("Customer order saved with ID:", customerOrderDocRef.id);
        
        await set(invoiceCounterRef, newInvoiceNumber);
        await set(tokenCounterRef, newTokenNumber);
        console.log("Counters updated:", { newInvoiceNumber, newTokenNumber });
        
        setLastInvoiceNumber(newInvoiceNumber);
        setLastTokenNumber(newTokenNumber);
        setCurrentOrderData(fullOrderData);
        setIsOrderPlaced(true);
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 3000);

        alert(`Order placed successfully! Token: ${newTokenNumber}`);
      });
    } catch (error) {
      console.error("Order save error:", error.code, error.message);
      alert(`Failed to process order: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!auth.currentUser) {
      console.warn("Unauthorized PDF download attempt");
      alert("Please log in to download PDF");
      return;
    }

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

        try {
          await retryFirebaseOperation(async () => {
            const customerOrdersCollection = collection(firestore, 'customerOrders');
            const querySnapshot = await getDocs(query(customerOrdersCollection, where("tokenNumber", "==", currentOrderData.tokenNumber)));
            if (!querySnapshot.empty) {
              const orderDoc = querySnapshot.docs[0];
              await updateDoc(doc(firestore, 'customerOrders', orderDoc.id), { pdfDownloaded: true });
              console.log("PDF download status updated for order:", orderDoc.id);
            } else {
              console.warn("No matching customer order found for token:", currentOrderData.tokenNumber);
            }
          });
        } catch (dbError) {
          console.error("PDF status update error:", dbError.message);
        }

        setPdfDownloaded(true);
        setShowWhatsAppButton(true);
        alert("PDF downloaded successfully!");
      } else {
        console.warn("No current order data for PDF download");
        alert("No order data available to generate PDF");
      }
    } catch (error) {
      console.error("PDF generation error:", error.message);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!auth.currentUser) {
      console.warn("Unauthorized WhatsApp share attempt");
      alert("Please log in to share via WhatsApp");
      return;
    }

    if (currentOrderData && pdfDownloaded) {
      sendWhatsAppMessage(currentOrderData);
    } else {
      console.log("PDF not downloaded or no order data");
      alert("Please download the PDF first.");
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
      newErrors.address = 'Address must be between 10 and 100 characters';
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

  // Retry button for connection errors
  const handleRetry = () => {
    setRetryCount(0);
    setConnectionError(null);
    loadProducts();
  };

  const isCartEmpty = cart.length === 0;

  return (
    <div className="products">
      <Helmet>
        <title>UDHAYAM CRACKERS - Diwali Special Offers 2025</title>
        <meta name="description" content="Browse our wide selection of high-quality crackers for all occasions." />
        <meta property="og:title" content="Udhayam Crackers - Product Catalog" />
        <meta property="og:description" content="Explore our diverse range of crackers. Shop now for the best deals!" />
        <meta property="og:image" content={defaultProductImage} />
        <meta property="og:url" content="https://www.udhayamcrackers.com/products" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Udhayam Crackers - Product Catalog" />
        <meta name="twitter:description" content="Discover our extensive range of crackers." />
        <meta name="twitter:image" content={defaultProductImage} />
        <meta name="keywords" content="crackers, fireworks, Diwali, celebration" />
        <meta name="author" content="Udhayam Crackers" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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

      {/* Connection Error Display */}
      {connectionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="mr-2" size={20} />
            <span>{connectionError}</span>
          </div>
          <button
            onClick={handleRetry}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Debug Info for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <strong>Debug Info:</strong>
          <ul className="text-sm mt-2">
            <li>Environment: {process.env.NODE_ENV}</li>
            <li>Firebase Project: {process.env.REACT_APP_FIREBASE_PROJECT_ID || 'Not set'}</li>
            <li>Auth Domain: {process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'Not set'}</li>
            <li>Products Loaded: {products.length}</li>
            <li>User Authenticated: {auth.currentUser ? 'Yes' : 'No'}</li>
            <li>Retry Count: {retryCount}</li>
          </ul>
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
        {isProductLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Loading products...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-4" size={48} color="#ef4444" />
            <p className="text-red-500 text-lg">No products available</p>
            <p className="text-gray-600 text-sm mt-2">
              This could be due to:
              <ul className="list-disc list-inside mt-2">
                <li>Firebase security rules blocking access</li>
                <li>Incorrect collection name in Firestore</li>
                <li>Network connectivity issues</li>
                <li>Authentication requirements not met</li>
              </ul>
            </p>
            <button
              onClick={handleRetry}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : (
          categories.map(category => {
            const categoryProducts = filteredProducts
              .filter(product => product.categorys === category)
              .sort((a, b) => (a.categoryPosition || 1) - (b.categoryPosition || 1));

            return (
              <div key={category}>
                <h2>{category}</h2>
                <div className="responsive-table">
                  {categoryProducts.length > 0 ? (
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
                        {categoryProducts.map((product, index) => {
                          const currentIndex = index + 1;
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
                                    disabled={isLoading || !auth.currentUser}
                                  >
                                    <Minus size={15} />
                                  </button>
                                  <input
                                    type="text"
                                    value={cart.find(item => item.id === product.id)?.quantity || ""}
                                    onChange={(e) => updateCart(product, parseInt(e.target.value) || 0)}
                                    className="quantity-input"
                                    placeholder='0'
                                    disabled={isLoading || !auth.currentUser}
                                  />
                                  <button 
                                    onClick={() => incrementQuantity(product)} 
                                    className="quantity-button"
                                    disabled={isLoading || !auth.currentUser}
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
                  ) : (
                    <p className="text-gray-500">No products available in this category.</p>
                  )}
                </div>
              </div>
            );
          })
        )}
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
                className={`px-3 py-2 text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${errors.name ? 'border-red-500' : ''}`}
                required
                disabled={isLoading || !auth.currentUser}
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
                disabled={isLoading || !auth.currentUser}
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
                disabled={isLoading || !auth.currentUser}
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
                disabled={isLoading || !auth.currentUser}
              />
              {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={clearCart}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
                disabled={isLoading || !auth.currentUser}
              >
                Clear Cart
              </button>
              {!isCartEmpty && auth.currentUser && (
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
              {!auth.currentUser && (
                <p className="text-red-500 text-sm">Please log in to place an order or modify the cart.</p>
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
                onClick={clearCart}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
                disabled={!auth.currentUser}
              >
                Clear Cart & New Order
              </button>

              {!pdfDownloaded && auth.currentUser && (
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

              {showWhatsAppButton && auth.currentUser && (
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
          Note: Please ensure that your order is selected correctly. Minimum order value is ₹3000.
        </p>

        {isOrderPlaced && (
          <p className="mt-4 text-sm text-green-600">
            <strong>Order Process:</strong> Your order has been placed successfully with Token No: {currentOrderData?.tokenNumber}! Please download the PDF invoice first, then use the WhatsApp button to share your order details.
          </p>
        )}
      </div>
    </div>
  );
}

export default Products;