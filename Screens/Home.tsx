import { View, FlatList, StyleSheet, Pressable, Keyboard, Image, TouchableWithoutFeedback } from 'react-native'
import { Button, Input, Layout, Modal, Text } from '@ui-kitten/components';
import React, { useState, useEffect, useMemo } from 'react'
import { apiConfig, firebase } from '../config';
import { FontAwesome } from "@expo/vector-icons";
import { Item, ItemToShow, ItemWithId } from '../types/item';
import DateSelector from '../Components/DateSelector';
import * as ImagePicker from 'expo-image-picker';
import { ScrollView } from 'react-native-gesture-handler';
import ImageItem from '../Components/ImageItem';
import * as LocalAuthentication from 'expo-local-authentication';

const CONSTANT_ITEM = {
  email: "darthzaq@gmail.com",
  private: false,
}

let timeOut = null;

const Home = () => {
  const [data, setData] = useState([]);
  const dataRef = firebase.firestore().collection('bitacora');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [clues, setClues] = useState(['']);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [dateEditionEnabled, setDateEditionEnabled] = useState(false);

  // const navigation = useNavigation();

  const pressHandler = async () => {
    try {
      LocalAuthentication.authenticateAsync({
        promptMessage: 'Face ID'
      }).then(({ success }) => {
        console.log('then');
        console.log('success: ', success);
      }).catch(() => {
        console.log('catch');
      });
    } catch(e) {
      console.log('e: ', e);
    }
  }

  const handleGetImages = async () => {
    if (title.length) {
      const response = await fetch(`${apiConfig.baseUrl}?q=${title}&tbm=${apiConfig.tbm}&ijn=${apiConfig.ijn}&api_key=${apiConfig.api_key}`);
      const data = await response.json();
      const nextImages = data.images_results.map((image) => image.original).slice(0,5);
      setImages(nextImages)
    }
  }

  const takeAndUploadPhotoAsync = async () => {
    // Display the camera to the user and wait for them to take a photo or to cancel
    // the action
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.cancelled) {
      return;
    }
    setImages(images.concat([result.uri]));
  }

  let date: Date = new Date();

  const onDateChange = (newDate: Date) => {
    date = newDate;
  }

  // fetch or read the data from firestore
  useEffect(() => {
    dataRef
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        querySnapshot => {
          const initialData = [];
          querySnapshot.forEach((doc) => {
            const item = doc.data()
            initialData.push({ id: doc.id, ...item})
          });
          setData(initialData);
        })
  }, []);

  // delete an item from firestore db
  const deleteItem = (item) => {
    dataRef
      .doc(item.id)
      .delete()
      .then(() => {
        // alert("Deleted successfully");
      })
      .catch(error => {
        alert(error);
      })
  }

  // add a todo
  const addItem = (dataPressed?: Item) => {
    const data: Item = dataPressed || {
      createdAt: date,
      description,
      ...CONSTANT_ITEM,
      tag: tag.split(','),
      title,
    };
    if (images && images.length) data.images = images;
    if (!data.title || !data.title.length) delete data.title;
    if (!data.description || !data.description.length) delete data.description;
    dataRef
      .add(data)
      .then(() => {
        // release todo state
        setTitle('');
        setDescription('');
        // release keyboard
        Keyboard.dismiss();

        setImages([]);
        setShowForm(false);
      })
      .catch((error) => {
        // show an alert in case of error
        alert(error);
      });
  }

  const updateItem = (id, newProps) => {
    dataRef
      .doc(id)
      .update(newProps).then(() => {
        alert('Updated successfully')
    }).catch((error) => {
      alert(error.message)
    })

  }

  const dataToShow = useMemo(() => {
    const result: ItemToShow[] = [];
    data.forEach((item: ItemWithId) => {
      const indexItemResult = result.findIndex((itemResult: ItemToShow) => itemResult.tag === item.tag);
      if (indexItemResult >= 0) result[indexItemResult].count += 1;
      else {
        result.push({ ...item, count: 1 });
      }
    });
    return result;
  }, [data]);

  const addBtnDisabled = !tag;

  const renderIconClueIcon = (props, index) => {
    const removeClue = () => {
      const nextClues = JSON.parse(JSON.stringify(clues));
      nextClues.splice(index, 1);
      setClues(nextClues);
    }

    const addClue = () => {
      setClues(clues.concat(['']));
    }

    return (
      <>
        {!!index && (
          <FontAwesome name="trash" onPress={removeClue} style={{ marginRight: 15 }} />
        )}
        {index === (clues.length - 1) && (
          <FontAwesome name="plus-circle" onPress={addClue} style={{ marginRight: 15 }} />
        )}
      </>
    )
  };

  return (
    <Layout style={{ flex: 1, paddingHorizontal: 10, justifyContent:'space-between' }}>
      <FontAwesome name="user-o" onPress={pressHandler} style={{ margin: 15 }} />
      {!showForm && (
        <Button onPress={() => {setShowForm(!showForm)}} style={{ marginLeft: 15 }}>
          { showForm ? 'Hide Form' : 'Show Form' }
        </Button>
      )}
      {showForm && (
        <Modal
          style={styles.modal}
          backdropStyle={styles.backdrop}
          visible={showForm}
          onBackdropPress={() => setShowForm(false)}>
          <ScrollView style={styles.formLayout}>
            <Layout style={styles.titleSection}>
              <Text category='h5'>FORM</Text>
            </Layout>
            <Layout style={{ flex: 1, padding: 10 }}>
              <Input
                label='Tag'
                placeholderTextColor="#aaaaaa"
                onChangeText={(text) => {
                  return setTag(text);
                }}
                value={tag}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
              />
              <Input
                label='Title'
                placeholderTextColor="#aaaaaa"
                onChangeText={(text) => {
                  setTitle(text);
                  clearTimeout(timeOut);
                  timeOut = setTimeout(handleGetImages, 1500)
                }}
                value={title}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
              />
              {
                clues.map((clue, index) => (
                  <Input
                    accessoryRight={(props) => renderIconClueIcon(props, index)}
                    label='Clue'
                    onChangeText={(text) => {
                      const nextClues = JSON.parse(JSON.stringify(clues));
                      nextClues[index] = text;
                      setClues(nextClues)
                    }}
                    value={clue}
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                  />
                ))
              }
              <Input
                label='Description'
                placeholderTextColor="#aaaaaa"
                onChangeText={(text) => setDescription(text)}
                value={description}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
              />
              <DateSelector onChange={onDateChange} onEditDate={setDateEditionEnabled} />
              <Layout style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 15 }}>
                <Text>
                  {(images && images.length) ? images.map((image: string) => (
                    <Image
                      source={{ uri: image }}
                      style={{ height: 100, width: 100  }}
                    />
                  )): (<Text>0 images uploaded</Text>)}
                </Text>
                <Layout style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                  <Button onPress={takeAndUploadPhotoAsync}>
                    Upload
                  </Button>
                  <Button onPress={() => {setImages([])}} style={{ marginLeft: 15 }} status="danger" disabled={!images.length}>
                    Remove Images
                  </Button>
                </Layout>
              </Layout>
              <Button
                disabled={addBtnDisabled}
                onPress={() => { addItem(); }} style={addBtnDisabled ? {...styles.button, ...styles.buttonDisabled} : styles.button}>
                Add
              </Button>
            </Layout>
          </ScrollView>
        </Modal>
      )}
      <Layout style={{ flex: dateEditionEnabled ? 1 : 2 }}>
        <Layout style={styles.titleSection}>
          <Text category='h5'>LIST</Text>
        </Layout>
        <FlatList
          style={{}}
          data={dataToShow}
          numColumns={1}
          renderItem={({ item }: { item: ItemToShow }) => {
            return (
              <View>
                <Pressable
                  disabled={!!item.title || !!item.description || !item.tag}
                  style={styles.container}
                  // @ts-ignore
                  onPress={() => {
                    addItem({ createdAt: new Date(), tag: item.tag, ...CONSTANT_ITEM });
                    // navigation.navigate('Detail', {item});
                  }}
                >
                  <FontAwesome name="trash-o"
                               color="red"
                               onPress={() => deleteItem(item)}
                               style={styles.trashIcon} />
                  <View style={styles.innerContainer}>
                    <Text style={styles.itemHeading}>
                      ({item.count})
                    </Text>
                    {(item.images && item.images.length) ? item.images.map((image) => (
                      <ImageItem
                        image={image}
                        onRemoveImage={() => {
                          const nextImages = item.images.filter((imageItem) => imageItem !== image);
                          updateItem(item.id, { ...item, images: nextImages });
                        }}
                      />
                    )) : <Text></Text>}
                    <Text style={styles.itemHeading}>
                      {item.tag}{item.title && ` - ${item.title}`}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )
          }}
        />
      </Layout>
    </Layout>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#e5e5e5',
    padding: 15,
    borderRadius: 15,
    margin:5,
    marginHorizontal: 10,
    flexDirection:'row',
    alignItems:'center'
  },
  formLayout: {
    height: '100%',
  },
  innerContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginLeft:45,
  },
  itemHeading: {
    fontWeight: 'bold',
    fontSize: 18,
    marginHorizontal: 5,
  },
  formContainer: {
    flex: 1,
    flexDirection: 'column',
    marginLeft:10,
    marginRight: 10,
    marginTop:100
  },
  modal: {
    minHeight: '100%',
    width: '90%',
  },
  button: {
    height: 47,
    borderRadius: 5,
    backgroundColor: '#788eec',
    marginVertical: 15,
    width: '80%',
    alignSelf: 'center',
    alignItems: "center",
    justifyContent: 'center'
  },
  buttonDisabled: {
    backgroundColor: 'grey',
    opacity: 0.4,
  },
  buttonText: {
    color: 'white',
    fontSize: 20
  },
  titleSection: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIcon:{
    marginTop:5,
    fontSize:20,
    marginLeft:14,
  }
});

export default Home

