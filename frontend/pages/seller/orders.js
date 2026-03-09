import { useState, useEffect } from react;
import { useRouter } from nextrouter;
import Link from nextlink;
import Navbar from ....componentslayoutNavbar;
import Footer from ....componentslayoutFooter;
import { useAuth } from .._app;
import api from ....libapi;
import toast from react-hot-toast;
import { FiPackage, FiArrowLeft, FiTruck, FiCheck, FiClock, FiX, FiDownload } from react-iconsfi;

const STATUS_STYLES = {
  pending    { bg bg-yellow-100 text-yellow-800, label Pending },
  paid       { bg bg-blue-100 text-blue-800,     label Paid },
  processing { bg bg-purple-100 text-purple-800, label Processing },
  shipped    { bg bg-orange-100 text-orange-800, label Shipped },
  delivered  { bg bg-green-100 text-green-800,   label Delivered },
  cancelled  { bg bg-red-100 text-red-800,       label Cancelled },
};

const STATUS_FLOW = [pending, paid, processing, shipped, delivered];

export default function SellerOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(all);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() = {
    if (!user) { router.push(login); return; }
    if (user.role !== seller && user.role !== admin) { router.push(); return; }
    fetchOrders();
  }, [user]);

  const fetchOrders = () = {
    api.get(ordersstore-orders)
      .then(r = setOrders(r.data.items  r.data  []))
      .catch(() = toast.error(Failed to load orders))
      .finally(() = setLoading(false));
  };

  const updateStatus = async (orderId, status) = {
    setUpdating(orderId);
    const tracking = trackingInputs[orderId]  {};
    try {
      await api.put(`orders${orderId}status`, {
        status,
        tracking_number tracking.number  undefined,
        tracking_url tracking.url  undefined,
      });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response.data.detail  Update failed);
    } finally { setUpdating(null); }
  };

  const downloadLabel = async (orderId) = {
    try {
      const r = await api.get(`shippinglabel${orderId}`);
      if (r.data.label_url) {
        window.open(r.data.label_url, _blank);
      } else {
        toast.error(No label yet — mark as shipped first);
      }
    } catch {
      toast.error(No shipping label found for this order);
    }
  };

  const filtered = filter === all  orders  orders.filter(o = o.status === filter);

  const counts = orders.reduce((acc, o) = {
    acc[o.status] = (acc[o.status]  0) + 1;
    return acc;
  }, {});

  return (
    
      Navbar 
      div className=max-w-5xl mx-auto px-4 py-8
        { Header }
        div className=flex items-center gap-3 mb-6 flex-wrap
          Link href=sellerdashboard className=text-gray-400 hovertext-gray-600
            FiArrowLeft size={20} 
          Link
          h1 className=text-2xl font-black text-gray-900 flex items-center gap-2
            FiPackage className=text-green-700  Orders
          h1
          span className=ml-1 text-sm text-gray-400{orders.length} totalspan
        div

        { Filter tabs }
        div className=flex gap-2 mb-6 flex-wrap
          {[all, pending, paid, processing, shipped, delivered, cancelled].map(s = (
            button key={s} onClick={() = setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                filter === s  bg-green-900 text-white  bg-gray-100 text-gray-600 hoverbg-gray-200
              }`}
              {s === all  `All (${orders.length})`  `${s} ${counts[s]  `(${counts[s]})`  }`}
            button
          ))}
        div

        {loading  (
          div className=space-y-3
            {[...Array(3)].map((_, i) = div key={i} className=h-24 bg-gray-200 rounded-2xl animate-pulse )}
          div
        )  filtered.length === 0  (
          div className=text-center py-16 text-gray-400
            FiPackage size={48} className=mx-auto mb-3 
            p className=font-medium text-lgNo {filter !== all  filter  } orders yetp
            p className=text-sm mt-1Orders from customers will appear herep
          div
        )  (
          div className=space-y-3
            {filtered.map(order = {
              const s = STATUS_STYLES[order.status]  STATUS_STYLES.pending;
              const isExpanded = expanded === order.id;
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

              return (
                div key={order.id} className=bg-white border rounded-2xl shadow-sm overflow-hidden
                  { Order row }
                  div className=p-4 flex items-center gap-4 cursor-pointer hoverbg-gray-50 transition-colors
                    onClick={() = setExpanded(isExpanded  null  order.id)}
                    div className=flex-1 min-w-0
                      div className=flex items-center gap-2 flex-wrap
                        span className=font-black text-gray-900Order #{order.id}span
                        span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg}`}{s.label}span
                        {order.tracking_number && (
                          span className=text-xs text-gray-400 font-mono{order.tracking_number}span
                        )}
                      div
                      p className=text-sm text-gray-500 mt-0.5
                        {new Date(order.created_at).toLocaleDateString()} · {order.items.length  0} item{order.items.length !== 1  s  }
                        {order.shipping_name && ` · ${order.shipping_name}`}
                      p
                    div
                    div className=text-right flex-shrink-0
                      p className=font-black text-gray-900${Number(order.total  0).toFixed(2)}p
                      p className=text-xs text-green-700Earn ${Number(order.seller_amount  0).toFixed(2)}p
                    div
                    span className=text-gray-400 text-xs{isExpanded  ▲  ▼}span
                  div

                  { Expanded detail }
                  {isExpanded && (
                    div className=border-t bg-gray-50 p-4
                      { Items }
                      div className=mb-4
                        p className=text-xs font-bold text-gray-500 uppercase mb-2Itemsp
                        div className=space-y-2
                          {(order.items  []).map(item = (
                            div key={item.id} className=flex items-center gap-3 bg-white rounded-xl p-3 border
                              {item.product.images.[0] && (
                                img src={item.product.images[0]} className=w-12 h-12 object-cover rounded-lg 
                              )}
                              div className=flex-1
                                p className=text-sm font-semibold text-gray-800{item.product.name  Product}p
                                p className=text-xs text-gray-400Qty {item.quantity} × ${Number(item.unit_price).toFixed(2)}p
                              div
                              p className=font-bold text-gray-900${Number(item.total_price).toFixed(2)}p
                            div
                          ))}
                        div
                      div

                      { Shipping address }
                      {order.shipping_address && (
                        div className=mb-4 bg-white rounded-xl p-3 border
                          p className=text-xs font-bold text-gray-500 uppercase mb-1Ship Top
                          p className=text-sm text-gray-700{order.shipping_name}p
                          p className=text-sm text-gray-500{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}p
                        div
                      )}

                      { Tracking input }
                      {order.status !== delivered && order.status !== cancelled && (
                        div className=mb-4 grid grid-cols-2 gap-2
                          input
                            placeholder=Tracking number (optional)
                            value={trackingInputs[order.id].number  }
                            onChange={e = setTrackingInputs(prev = ({ ...prev, [order.id] { ...prev[order.id], number e.target.value } }))}
                            className=border rounded-xl px-3 py-2 text-sm focusoutline-none focusring-2 focusring-green-700
                          
                          input
                            placeholder=Tracking URL (optional)
                            value={trackingInputs[order.id].url  }
                            onChange={e = setTrackingInputs(prev = ({ ...prev, [order.id] { ...prev[order.id], url e.target.value } }))}
                            className=border rounded-xl px-3 py-2 text-sm focusoutline-none focusring-2 focusring-green-700
                          
                        div
                      )}

                      { Action buttons }
                      div className=flex gap-2 flex-wrap
                        {nextStatus && order.status !== cancelled && (
                          button onClick={() = updateStatus(order.id, nextStatus)}
                            disabled={updating === order.id}
                            className=flex items-center gap-2 bg-green-900 hoverbg-green-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabledopacity-50
                            {nextStatus === shipped  FiTruck size={14}   nextStatus === delivered  FiCheck size={14}   FiClock size={14} }
                            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                          button
                        )}
                        button onClick={() = downloadLabel(order.id)}
                          className=flex items-center gap-2 bg-yellow-500 hoverbg-yellow-400 text-green-900 px-4 py-2 rounded-xl text-sm font-bold transition-colors
                          FiDownload size={14}  Shipping Label
                        button
                        {order.status === pending && (
                          button onClick={() = updateStatus(order.id, cancelled)}
                            disabled={updating === order.id}
                            className=flex items-center gap-2 bg-red-50 hoverbg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                            FiX size={14}  Cancel
                          button
                        )}
                      div
                    div
                  )}
                div
              );
            })}
          div
        )}
      div
      Footer 
    
  );
}