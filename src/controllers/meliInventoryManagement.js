import axios from 'axios';
import  { GoogleSpreadsheet } from 'google-spreadsheet';
import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};                    // /Users/Franco/Desktop/credentials/FC.json
import meliInventoryManagement from '../credentials/credenciales_definitivas.json' assert { type: "json" };      // Comienzo de exportacion a Gshhets.-
import dotenv from "dotenv";
dotenv.config({path:"../../.env"});

let urlSeller = process.env.URL_SELLER_MELI_INVENTORY_MANAGEMENT;
let now                     = new Date();
let nowNumber               = now.getTime();
let horas                   = now.getHours();
let minutos                 = ("0" + now.getMinutes() ).slice(-2);                                          //Esto para que el formato de minuto sea "09" y no "9"
let horaMinuto              = " " + horas + ":" + minutos;
let dia                     = ("0" + now.getDate()).slice(-2);                                              //Esto para que el formato de hora sea "09" y no "9"
let anio                    = now.getFullYear();
let mes                     = now.getMonth() + 1;
let dosMesesAntes           = now.getMonth() + -1;
let hora_hoy                = anio + "/" + mes + "/" + dia;
let hora_hoyHaceDosMeses    = anio + "/" + dosMesesAntes + "/" + dia;
let date                    = " " + horaMinuto + " " + hora_hoy;
const consultaAPI  = async () => {
    console.log(token.default.access_token);
    let dataSeller = await axios({ 
       method:'get',
       url: urlSeller,
       headers: {'Authorization':`Bearer ${token.default.access_token}`},
       params: {offset: 0}   
   });

   let allItems = [];
   let arrayContainerIDProductSeller = [];
   let objContenedor = {};
   let containerArrayStockProducts = [];
   try {
       let resp                = dataSeller.data;                                                           //Obtiene la info del producto buscado por la API
       let limit               = resp.paging.limit;
       let offset              = resp.paging.offset;
       let totalPublicaciones  = resp.paging.total;
       let page                = Math.ceil(totalPublicaciones / limit);
       /* Extraemos la totalidad de los productos */
       for (let i = 0; i < page; i++) {
           let pageItems = await axios({ 
               method:'get',
               url: urlSeller+`&offset=${i * limit}`,
               headers: {'Authorization':`Bearer ${token.default.access_token}`},
           }).catch(function (error) {
            console.log("Something's wrong");
            });
           allItems.push(...pageItems.data.results);
       }
       
      /* Extraemos solo el id de cada producto */
       for (let index = 0; index < allItems.length; index++) {
           objContenedor.id    =   allItems[index].id;

           arrayContainerIDProductSeller.push({id: objContenedor.id});
       }
       //console.log(arrayContainerIDProductSeller);
       

       /* Extraemos el dato inventory_id */
       let arrayContenedorInventoryIds = []
       let capturaMCO = []
       let inventory_id_deCadaProducto
       let responseAtributes
       let variationArray = []
       let variationArrayId = []
       for (let i = 0; i < allItems.length; i++) {

           let responseAtributeData = await axios({                                                         //Hace el llamado para extraer la info del producto del Vendedor
               method:'get',
               url: `https://api.mercadolibre.com/items/${arrayContainerIDProductSeller[i].id}`,
               headers: {'Authorization':`Bearer ${token.default.access_token}`},
           }).catch(function (error) {
            console.log("Something's wrong");
          });   
            inventory_id_deCadaProducto = responseAtributeData.data.inventory_id                            //Almacenamos cada valor de "inventory_id" en una variable
           let inventoryIdResponseAtributeDataVariations = responseAtributeData.data.variations;            //Y por otro lado, el de las variaciones
           let lengthArrayVariations = inventoryIdResponseAtributeDataVariations.length;                    //Sacamos el largo, ya que no es el mismo, para luego iterarlo en un array
           

           responseAtributes = responseAtributeData.data.attributes
           

           for (let indexChikitito = 0; indexChikitito < lengthArrayVariations; indexChikitito++) {                                   
            const element = inventoryIdResponseAtributeDataVariations[indexChikitito];                      //Llamamos a un array uy pusheamos los valores en el mismo
            //console.log(element.inventory_id);
            capturaMCO.push(arrayContainerIDProductSeller[i].id);
            arrayContenedorInventoryIds.push(element.inventory_id)
            variationArray.push(element)
            variationArrayId.push(element.id)
            }
        }
        let filtroInventoryIds = arrayContenedorInventoryIds.filter(element => element !== null)            //Luego filtramos los que tienen valor null
        console.log(filtroInventoryIds.length);
        for (let indexInventory = 0; indexInventory < filtroInventoryIds.length; indexInventory++) {
           //En caso de que el producto al que estamos iterando tenga la propiedad "inventory_id", se ejecuta lo siguiente
    
                let busquedaSKU     = responseAtributes;                                                    //Almacenamos los atributos de c/producto en una variable
                let sellerSKU_conVariaciones                                                                //Seteamos las variables para luego darle su valor
                let sellerSku                                                                               //Seteamos las variables para luego darle su valor
                console.log(busquedaSKU);
                if (variationArray.length == 0) {
                    let findSKUObject   = busquedaSKU.find(element => element.id == "SELLER_SKU");          //Si no tiene variantes, Filtramos entre los atributos por los que tengan como id "SELLER_SKU"
                    sellerSku       = findSKUObject?.value_name;                                            //Extraemos su valor y lo guardamos            
                }else{
                    const llamadaVarianteObjeto = await axios(`https://api.mercadolibre.com/items/${capturaMCO[indexInventory]}/variations/${variationArrayId[indexInventory]}`);
                    console.log(llamadaVarianteObjeto.data);
                    let atributesVariantsProducts = llamadaVarianteObjeto.data.attributes;
                    sellerSKU_conVariaciones = atributesVariantsProducts.find(element => element.id == "SELLER_SKU");     //Hacemos que encuentre el objeto cuyo id sea Seller_SKU
                }

                /* Hasta acá tenemos el SKU del producto */
    
                let responseStockData = await axios({                                                       //Ejecutamos la segunda llamada, para extraer el resto de datos (totalStock, available_quantity,etc.)
                    method:'get',
                    url: `https://api.mercadolibre.com/inventories/${filtroInventoryIds[indexInventory]}/stock/fulfillment`,
                    headers: {'Authorization':`Bearer ${token.default.access_token}`},
                }).catch(function (error) {
                    console.log("Something's wrong");
                  });
                //console.log(responseStockData.data);
                //Almacenamos los valores en variables
                let inventory_id                      = responseStockData.data.inventory_id;
                let totalStock                      = responseStockData.data.total;
                let available_quantity              = responseStockData.data.available_quantity;
                let not_available_quantity          = responseStockData.data.not_available_quantity;
                let not_available_detail            = responseStockData.data.not_available_detail[0]?.status;
                let external_referencesId           = responseStockData.data.external_references[0]?.id;
                let external_referencesVariationId  = responseStockData.data.external_references[0]?.variation_id;
    
                //Pasamos los valores dentro de un objeto, al array "containerArrayStockProducts"
                 containerArrayStockProducts.push({
                    MCO:                            capturaMCO[indexInventory],
                    SellerSKU:                      variationArray.length == 0 ? sellerSku : sellerSKU_conVariaciones.value_name,   //Si el array de variaciones es vacío, trae el sku de otro lado
                    inventory_id:                   inventory_id,
                    totalStock:                     totalStock,
                    available_quantity:             available_quantity,
                    not_available_quantity:         not_available_quantity,
                    //not_available_detail:           not_available_detail,
                    external_referencesId:          external_referencesId,
                    //external_referencesVariationId: external_referencesVariationId,
                    timestamp: date,
                });
        }
       
       const   credenciales  = meliInventoryManagement;
       let     googleId      = process.env.GOOGLE_ID_MELI_INVENTORY_MANAGEMENT_MEX;                             //ID permisos GooglSheet

       (async () =>{
                   
           async function exportaSheet(){
               const documento = new GoogleSpreadsheet(googleId);
               await documento.useServiceAccountAuth(credenciales);
               await documento.loadInfo();

               const sheet =documento.sheetsByTitle['APP_StockFull'];                                       //Selecciona la hoja a la cual plasmará el contenido, el valor se lo pasa por parámetro para no repetir
               await sheet.clearRows();                                                                     //Limpia las columnas
               await sheet.addRows(containerArrayStockProducts);                                            //Añade la información del array               
           };
           //Una vez que haya extraido toda la info de los productos disponibles, lo plasma en el Sheet
           console.log('***Importando datos a spreadsheet***');
           //Ejecuta el código y muestra los datos en el sheet
           exportaSheet()
           console.log("***Finalizó proceso importación***");
       })();
   } catch (error) {
       console.error(error);
   }  
}
consultaAPI()