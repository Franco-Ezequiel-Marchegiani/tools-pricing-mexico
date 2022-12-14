import axios from 'axios';
import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};                    // /Users/Franco/Desktop/credentials/FC.json
import meliInventoryManagement from '../credentials/credenciales_definitivas.json' assert { type: "json" };      // Comienzo de exportacion a Gshhets.-
import dotenv from "dotenv";
import { exportSheet, dateToday, llamadaAPI } from '../funciones/funcionesUtiles.js';
dotenv.config({path:"../../.env"});

let urlSeller = process.env.URL_SELLER_MELI_INVENTORY_MANAGEMENT;
/* Horarios */
dateToday();

const consultaAPI  = async () => {
    const head = {'Authorization':`Bearer ${token.default.access_token}`};
    console.log(token.default.access_token);
    const dataSeller =await llamadaAPI("get",urlSeller,head,{offset: 0})

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
        const pageItems =await llamadaAPI("get",urlSeller+`&offset=${i * limit}`,head)
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
            const responseAtributeData =await llamadaAPI("get",`https://api.mercadolibre.com/items/${arrayContainerIDProductSeller[i].id}`,head)
             
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

                /* Hasta ac?? tenemos el SKU del producto */
                const responseAtributeData =await llamadaAPI("get",`https://api.mercadolibre.com/inventories/${filtroInventoryIds[indexInventory]}/stock/fulfillment`,head)

                
                //Pasamos los valores dentro de un objeto, al array "containerArrayStockProducts"
                 containerArrayStockProducts.push({
                    MCO:                            capturaMCO[indexInventory],
                    SellerSKU:                      variationArray.length == 0 ? sellerSku : sellerSKU_conVariaciones.value_name,   //Si el array de variaciones es vac??o, trae el sku de otro lado
                    inventory_id:                   responseStockData.data.inventory_id,
                    totalStock:                     responseStockData.data.total,
                    available_quantity:             responseStockData.data.available_quantity,
                    not_available_quantity:         responseStockData.data.not_available_quantity,
                    external_referencesId:          responseStockData.data.external_references[0]?.id,
                    timestamp: dateToday().date,
                });
        }
       const   credenciales  = meliInventoryManagement;
       let     googleId      = process.env.GOOGLE_ID_MELI_INVENTORY_MANAGEMENT_MEX;                             //ID permisos GooglSheet
       console.log('***Importando datos a spreadsheet***');
       exportSheet(googleId,credenciales,'APP_StockFull',containerArrayStockProducts);
       console.log("***Finaliz?? proceso importaci??n***");
    } catch (error) {
       console.error(error);
    }  
}
consultaAPI()

/* 
                //Almacenamos los valores en variables
                let inventory_id                      = responseStockData.data.inventory_id;
                let totalStock                      = responseStockData.data.total;
                let available_quantity              = responseStockData.data.available_quantity;
                let not_available_quantity          = responseStockData.data.not_available_quantity;
                let external_referencesId           = responseStockData.data.external_references[0]?.id;
                let not_available_detail            = responseStockData.data.not_available_detail[0]?.status;
                let external_referencesVariationId  = responseStockData.data.external_references[0]?.variation_id;
                 */
/* 
       FREE COMMITS
       (async () =>{
                   
           async function exportaSheet(){
               const documento = new GoogleSpreadsheet(googleId);
               await documento.useServiceAccountAuth(credenciales);
               await documento.loadInfo();

               const sheet =documento.sheetsByTitle['APP_StockFull'];                                       //Selecciona la hoja a la cual plasmar?? el contenido, el valor se lo pasa por par??metro para no repetir
               await sheet.clearRows();                                                                     //Limpia las columnas
               await sheet.addRows(containerArrayStockProducts);                                            //A??ade la informaci??n del array               
           };
           //Una vez que haya extraido toda la info de los productos disponibles, lo plasma en el Sheet
           console.log('***Importando datos a spreadsheet***');
           //Ejecuta el c??digo y muestra los datos en el sheet
           exportaSheet()
           console.log("***Finaliz?? proceso importaci??n***");
       })(); */
       /* 
                FREE COMMITS
                let responseStockData = await axios({                                                       //Ejecutamos la segunda llamada, para extraer el resto de datos (totalStock, available_quantity,etc.)
                    method:'get',
                    url: `https://api.mercadolibre.com/inventories/${filtroInventoryIds[indexInventory]}/stock/fulfillment`,
                    headers: head,
                }).catch(function (error) {
                    console.log("Something's wrong");
                  }); */
                  //not_available_detail:           not_available_detail,
                  //external_referencesVariationId: external_referencesVariationId,
                //console.log(responseStockData.data);
                /* 
import  { GoogleSpreadsheet } from 'google-spreadsheet';

FREE COMMITS
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
let date                    = " " + horaMinuto + " " + hora_hoy; */
/* 
    FREE COMMITS
    let dataSeller = await axios({ 
       method:'get',
       url: urlSeller,
       headers: head,
       params: {offset: 0}   
   }); */
   /* 
           COMMITS
           let pageItems = await axios({ 
               method:'get',
               url: urlSeller+`&offset=${i * limit}`,
               headers: head,
           }).catch(function (error) {
            console.log("Something's wrong");
            }); */
    /* 
           FREE COMMITS
           let responseAtributeData = await axios({                                                         //Hace el llamado para extraer la info del producto del Vendedor
               method:'get',
               url: `https://api.mercadolibre.com/items/${arrayContainerIDProductSeller[i].id}`,
               headers: head,
           }).catch(function (error) {
            console.log("Something's wrong");
          });  */