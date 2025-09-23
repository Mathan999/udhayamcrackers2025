import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, deleteDoc, onSnapshot, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firestore } from "../../firebase";
import { X, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

function Products1() {
  const [filter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const CLOUDINARY_UPLOAD_PRESET = "mahithra";
  const CLOUDINARY_CLOUD_NAME = "dirbsbdfh";
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
    "50 SPARKLERS"
  ];

  useEffect(() => {
    setLoading(true);
    const productsCollection = collection(firestore, 'products');

    // Fetch from Firestore only
    const unsubscribeFirestore = onSnapshot(productsCollection, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        firestoreDocId: doc.id,
        ...doc.data(),
        categorys: doc.data().categorys || doc.data().climate || 'Unspecified',
        imageUrl: doc.data().imageUrl || '/assets/logo_1x1.png'
      }));
      console.log('Firestore products:', firestoreProducts);
      setProducts(firestoreProducts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching from Firestore:", error);
      setError("Failed to fetch products from Firestore: " + error.message);
      setLoading(false);
    });

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  const filteredProducts = products.filter(product =>
    (filter === 'all' || 
     (product.categorys && product.categorys.toLowerCase() === filter.toLowerCase())) &&
    (product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
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

  const handleEdit = (product) => {
    setEditingProduct({
      ...product,
      categorys: product.categorys || product.climate || 'ELECTRIC CRACKERS',
      mrp: Number(product.mrp) || 0,
      discount: Number(product.discount) || 0,
      ourPrice: Number(product.ourPrice) || 0
    });
    setNewImage(null);
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setNewImage(e.target.files[0]);
    }
  };

  const validateInputs = (product) => {
    const errors = {};
    if (!product.productName || product.productName.trim().length < 3) {
      errors.productName = 'Product name must be at least 3 characters';
    }
    if (!product.categorys || !categories.includes(product.categorys)) {
      errors.categorys = 'Please select a valid category';
    }
    if (!product.category || !['1Box', '1pkt'].includes(product.category)) {
      errors.category = 'Please select a valid category (1Box or 1pkt)';
    }
    const mrp = Number(product.mrp);
    if (isNaN(mrp) || mrp <= 0) {
      errors.mrp = 'Please enter a valid MRP greater than 0';
    }
    const discount = Number(product.discount);
    if (isNaN(discount) || discount < 0) {
      errors.discount = 'Please enter a valid discount (0 or greater)';
    }
    const ourPrice = Number(product.ourPrice);
    if (isNaN(ourPrice) || ourPrice <= 0) {
      errors.ourPrice = 'Please enter a valid price greater than 0';
    }
    setError(Object.keys(errors).length > 0 ? Object.values(errors).join(', ') : null);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!editingProduct) {
      setError("No product selected for editing.");
      return;
    }

    if (!validateInputs(editingProduct)) {
      console.log("Validation failed:", error);
      return;
    }

    // Check authentication
    const auth = getAuth();
    if (!auth.currentUser) {
      setError("You must be signed in to update products.");
      return;
    }

    setError(null);
    let updatedProduct = { ...editingProduct };
    console.log("Updating product:", updatedProduct);

    if (newImage) {
      try {
        const formData = new FormData();
        formData.append("file", newImage);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (response.data.secure_url) {
          updatedProduct.imageUrl = response.data.secure_url;
          console.log("Image uploaded to Cloudinary:", updatedProduct.imageUrl);
        } else {
          throw new Error("Failed to upload image to Cloudinary");
        }
      } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        setError("Failed to upload image: " + error.message);
        return;
      }
    }

    try {
      // Update in Firestore only
      console.log("Updating Firestore for doc ID:", editingProduct.firestoreDocId);
      const docRef = doc(firestore, 'products', editingProduct.firestoreDocId);
      await updateDoc(docRef, {
        productName: updatedProduct.productName,
        code: updatedProduct.code || '',
        category: updatedProduct.category,
        categorys: updatedProduct.categorys,
        climate: updatedProduct.categorys,
        mrp: Number(updatedProduct.mrp),
        discount: Number(updatedProduct.discount),
        ourPrice: Number(updatedProduct.ourPrice),
        imageUrl: updatedProduct.imageUrl
      });
      console.log("Firestore updated successfully for doc ID:", editingProduct.firestoreDocId);

      setProducts(prevProducts =>
        prevProducts.map(p => p.id === updatedProduct.id ? { ...updatedProduct, firestoreDocId: editingProduct.firestoreDocId } : p)
      );
      setEditingProduct(null);
      setNewImage(null);
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      setError("Failed to update product: " + error.message);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      try {
        console.log("Deleting product ID:", productId);
        
        // Find the product to get its Firestore document ID
        const productToDelete = products.find(p => p.id === productId);
        if (!productToDelete) {
          setError("Product not found.");
          return;
        }

        // Delete from Firestore permanently
        const docRef = doc(firestore, 'products', productToDelete.firestoreDocId);
        await deleteDoc(docRef);
        console.log("Firestore product permanently deleted for doc ID:", productToDelete.firestoreDocId);

        // Remove from local state
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
        alert("Product permanently deleted successfully!");
      } catch (error) {
        console.error("Error deleting product:", error);
        setError("Failed to delete product: " + error.message);
      }
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Link to='/admin' className="text-2xl bg-gray-400 px-2 py-3 rounded-2xl" style={{ marginBottom: '30px'}}> ⬅ Back</Link>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-6 border-2xl border-[#000!important] rounded text-black mt-10"
        />
        {loading ? (
          <p className="text-center text-gray-500">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-red-500">No products found. Please check your database or upload new products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2">Preview</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Per</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">M.R.P</th>
                  <th className="px-4 py-2">Discount</th>
                  <th className="px-4 py-2">Our Price</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-b">
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <div className="flex flex-col items-center">
                          <img 
                            src={newImage ? URL.createObjectURL(newImage) : product.imageUrl} 
                            alt={product.productName || 'Product'} 
                            className="w-20 h-20 object-cover mb-2"
                            onError={(e) => {
                              e.target.src = '/assets/logo_1x1.png';
                            }}
                          />
                          <input 
                            type="file" 
                            onChange={handleImageChange} 
                            accept="image/*" 
                            className="text-sm" 
                          />
                        </div>
                      ) : (
                        <img 
                          src={product.imageUrl} 
                          alt={product.productName || 'Product'} 
                          className="w-20 h-20 object-cover cursor-pointer" 
                          onClick={() => setSelectedImage(product.imageUrl)}
                          onError={(e) => {
                            e.target.src = '/assets/logo_1x1.png';
                          }}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <input 
                          value={editingProduct.code || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})} 
                          className="w-full p-1 border rounded" 
                        />
                      ) : (
                        product.code || '-'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <input 
                          value={editingProduct.productName || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, productName: e.target.value})} 
                          className="w-full p-1 border rounded" 
                        />
                      ) : (
                        product.productName || '-'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <select
                          value={editingProduct.category || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                          className="w-full p-1 border rounded"
                        >
                          <option value="1Box">1Box</option>
                          <option value="1pkt">1pkt</option>
                        </select>
                      ) : (
                        product.category || '-'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <select
                          value={editingProduct.categorys || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, categorys: e.target.value})}
                          className="w-full p-1 border rounded"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        product.categorys || 'Unspecified'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <input 
                          type="number" 
                          value={editingProduct.mrp || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, mrp: e.target.value})} 
                          className="w-full p-1 border rounded" 
                        />
                      ) : (
                        <s>₹{Number(product.mrp || 0).toFixed(2)}</s>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <input 
                          type="number" 
                          value={editingProduct.discount || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, discount: e.target.value})} 
                          className="w-full p-1 border rounded" 
                        />
                      ) : (
                        `${product.discount || 0}%`
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <input 
                          type="number" 
                          value={editingProduct.ourPrice || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, ourPrice: e.target.value})} 
                          className="w-full p-1 border rounded" 
                        />
                      ) : (
                        `₹${Number(product.ourPrice || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        min="0" 
                        onChange={(e) => updateCart(product, parseInt(e.target.value) || 0)} 
                        value={cart.find(item => item.id === product.id)?.quantity || ''}
                        className="w-16 p-1 border rounded"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      ₹{(Number(product.ourPrice || 0) * (cart.find(item => item.id === product.id)?.quantity || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {editingProduct?.id === product.id ? (
                        <button 
                          onClick={handleSave} 
                          className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <X size={18} />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(product)} 
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)} 
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative">
              <img 
                src={selectedImage} 
                alt="Full size product" 
                className="max-w-full max-h-full" 
                onError={(e) => {
                  e.target.src = '/assets/logo_1x1.png';
                }}
              />
              <button 
                className="absolute top-2 right-2 bg-white rounded-full p-1" 
                onClick={() => setSelectedImage(null)}
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Products1;